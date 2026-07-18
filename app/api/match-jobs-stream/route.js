import { auth } from '@clerk/nextjs/server';
import { fetchAllJobsStreaming } from '@/lib/job-fetcher';
import { calculatePandaScore } from '@/lib/panda-matcher';
import { rateLimit } from '@/lib/rate-limit';
import { saveAlertProfile } from '@/lib/job-alerts';
import { detectGhostSignals } from '@/lib/ghost-detector';
import { analyzeJobQuality } from '@/lib/jd-quality';
import { predictSalary } from '@/lib/salary-predictor';
import { predictSuccessProbability } from '@/lib/success-predictor';
import { logMatch } from '@/lib/debug/match-logger';
import { enrichThinJDs } from '@/lib/jd-enricher';
import { getUserActions } from '@/lib/feedback-tracker';
import { classifyProfile } from '@/lib/profile-classifier';
import { getJobEmbeddings, getRoleEmbedding, jobKey } from '@/lib/job-embeddings';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';



const ScanPayloadSchema = z.object({
  profile: z.object({
    headline: z.string().max(200, "Headline too long").optional().default(""),
    skills: z.array(z.string().max(100)).max(50, "Maximum of 50 skills allowed"),
    experience_years: z.number().min(0).max(100).optional().default(0),
    location: z.string().max(200).optional().default(""),
  }).passthrough(),
  preferences: z.object({
    midasSearch: z.boolean().optional().default(false),
    filters: z.any().optional(),
  }).passthrough().optional().default({}),
});

export async function POST(request) {
  // ---- Auth, validation, and rate limiting ----
  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response(JSON.stringify({
        error: 'Sign in to search and keep your results available across devices.',
        requiresAuth: true,
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const rl = await rateLimit(userId, 10, 60);

    if (!rl.allowed) {
      const minutes = Math.ceil(rl.retryAfter / 60);
      return new Response(JSON.stringify({
        error: `Rate limit reached. You can search again in ${minutes} minute${minutes !== 1 ? 's' : ''}. This helps us keep Midas free for everyone.`,
        retryAfter: rl.retryAfter,
        rateLimited: true
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter) }
      });
    }

    const rawBody = await request.json();

    const validationResult = ScanPayloadSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return new Response(JSON.stringify({
        error: 'Invalid scan payload provided.',
        details: validationResult.error.errors
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { profile, preferences } = validationResult.data;

    if (!profile || !profile.skills || profile.skills.length === 0) {
      return new Response(JSON.stringify({ error: 'Profile with skills required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const effectiveUserId = ip.split(',')[0].trim();
    
    console.log(JSON.stringify({
      event: 'scan_started',
      userId: userId || 'anonymous',
      ip: effectiveUserId,
      headline: profile.headline?.slice(0, 60),
      skills: profile.skills?.slice(0, 5),
      location: profile.location,
      midasSearch: preferences?.midasSearch || false,
      timestamp: new Date().toISOString(),
    }));

    // Fetch historical feedback actions to close the RLHF loop
    let feedbackHistory = [];
    if (userId) {
      try {
        feedbackHistory = await getUserActions(userId, 100);
      } catch (err) {
        console.error('[RLHF] Failed to fetch feedback history:', err);
      }
    }
    preferences.feedbackHistory = feedbackHistory;

    // ---- SSE Stream ----
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (data) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            // Controller may be closed if client disconnected
          }
        };

        try {
          const sourceCounts = {};
          // Diagnostic capture: per-source score distribution + sample discarded jobs
          const diag = {
            scanId: `${Date.now()}-${(userId || 'anon').slice(-6)}`,
            startMs: Date.now(),
            sources: {},
            topDisplayed: [],   // top 10 jobs >= 25
            topDiscarded: [],   // top 10 jobs in 15-24 range (almost-good)
            killers: {},        // counts of which multipliers killed jobs
          };

          send({ type: 'progress', message: 'Starting job search...' });

          const classifyPromise = classifyProfile(profile.headline, profile.skills)
            .then(result => {
              if (result) {
                profile._llmFamily = result.family;
                profile._llmAntiFamilies = result.antiFamilies;
              }
            })
            .catch(() => {});

          const _logPromises = [];
          // Accumulates scored jobs (score > 0) across all sources so the
          // post-scan semantic re-rank can pick the top candidates to embed.
          const allScored = [];

          let totalJobsScored = 0;
          const onSourceComplete = async (sourceName, jobs) => {
            await classifyPromise;

            totalJobsScored += jobs.length;

            send({ type: 'progress', message: `Scoring ${sourceName}...` });

            const sourceDiag = { fetched: jobs.length, scored: 0, displayed: 0, discarded: 0, zero: 0, enriched: 0 };

            // JD Enrichment: fetch full descriptions for thin-snippet jobs
            // BEFORE scoring so Panda has real text to match skills against.
            try {
              const enriched = await enrichThinJDs(jobs);
              sourceDiag.enriched = enriched;
              if (enriched > 0) {
                send({ type: 'progress', message: `Enriched ${enriched} job descriptions from ${sourceName}` });
              }
            } catch (e) {
              console.warn(`[JD_ENRICH] Failed for ${sourceName}:`, e.message);
            }

            // Score each job with Panda + enrich with intelligence engines
            const scoredJobs = await Promise.all(
              jobs.map(async (job) => {
                try {
                  const pandaScore = await calculatePandaScore(job, profile, preferences, {});

                  // Run intelligence engines (all sync, no API calls)
                  const ghost = detectGhostSignals(job, jobs);
                  const quality = analyzeJobQuality(job);
                  const salary = predictSalary(job);
                  const success = predictSuccessProbability(job, profile, pandaScore);

                  // Diagnostic accounting
                  sourceDiag.scored++;
                  const s = pandaScore?.score ?? 0;
                  // Dynamic display threshold: same-family matches (roleFamily ≥ 1.1) get a lower
                  // bar to compensate for thin JDs that don't have enough keywords to score high.
                  // A PwC Deal Advisory with only "M&A" in the snippet should still surface.
                  const isSameFamily = parseFloat(pandaScore?.multipliers?.roleFamily || '1.0') >= 1.1;
                  const displayThreshold = isSameFamily ? 20 : 25;
                  if (s >= displayThreshold) {
                    sourceDiag.displayed++;
                    if (diag.topDisplayed.length < 10) {
                      diag.topDisplayed.push({ s, t: job.title?.slice(0, 60), c: job.company, src: sourceName });
                    }
                    _logPromises.push(logMatch({
                      stage: 'list_score',
                      profile,
                      job,
                      pandaScore: s,
                      pandaBreakdown: pandaScore,
                      llmScore: null,
                      aiVerdict: null,
                      combinedScore: s,
                    }));
                  } else if (s > 0) {
                    sourceDiag.discarded++;
                    if (s >= 15 && diag.topDiscarded.length < 10) {
                      // Identify which multiplier killed it
                      const m = pandaScore.multipliers || {};
                      const killers = [];
                      if (parseFloat(m.location) < 0.1) killers.push(`loc=${m.location}`);
                      if (parseFloat(m.roleFamily) < 0.5) killers.push(`role=${m.roleFamily}`);
                      if (parseFloat(m.domain) < 0.5) killers.push(`domain=${m.domain}`);
                      if (parseFloat(m.seniority) < 0.3) killers.push(`sen=${m.seniority}`);
                      if (parseFloat(m.recency) < 0.5) killers.push(`rec=${m.recency}`);
                      if (parseFloat(m.coherence) < 0.5) killers.push(`coh=${m.coherence}`);
                      let killer = killers.join(',') || (isSameFamily ? 'same_fam:low_raw' : 'low_raw');
                      const topTokens = (pandaScore.matches || []).slice(0, 3).map(m => m.skill || m.keyword || m);
                      diag.topDiscarded.push({ s, t: job.title?.slice(0, 60), c: job.company, src: sourceName, killer, tokens: topTokens });
                      diag.killers[killer] = (diag.killers[killer] || 0) + 1;
                    }
                    _logPromises.push(logMatch({
                      stage: 'list_score',
                      profile,
                      job,
                      pandaScore: s,
                      pandaBreakdown: pandaScore,
                      llmScore: null,
                      aiVerdict: null,
                      combinedScore: s,
                      notes: `discarded:below_threshold(25)`,
                    }));
                  } else {
                    sourceDiag.zero++;
                  }

                  return {
                    ...job,
                    pandaScore,
                    intelligence: { ghost, quality, salary, success },
                  };
                } catch {
                  return { ...job, pandaScore: null, intelligence: null };
                }
              })
            );

            sourceCounts[sourceName] = scoredJobs.length;
            diag.sources[sourceName] = sourceDiag;

            // Retain scored jobs for the post-scan semantic re-rank.
            for (const sj of scoredJobs) {
              if ((sj.pandaScore?.score ?? 0) > 0) allScored.push(sj);
            }

            send({
              type: 'jobs',
              source: sourceName,
              jobs: scoredJobs,
              total: scoredJobs.length
            });
          };

          const onProgress = (msg) => {
            send({ type: 'progress', message: msg });
          };

          const result = await fetchAllJobsStreaming(
            profile,
            {},
            onSourceComplete,
            onProgress,
            preferences
          );

          // ── Semantic re-rank pass ──────────────────────────────────────
          // Embed the top heuristic candidates + the user's role text, then
          // re-score them through Panda's semantic block (which activates only
          // when __precomputedJobEmb/__precomputedRoleEmb are present). Pure
          // refinement: any failure leaves the streamed heuristic results intact.
          try {
            if (process.env.OPENAI_API_KEY && allScored.length) {
              const TOP_K = 120;
              const candidates = allScored
                .filter((j) => (j.pandaScore?.score ?? 0) > 0)
                .sort((a, b) => b.pandaScore.score - a.pandaScore.score)
                .slice(0, TOP_K);

              const [roleEmb, jobEmbMap] = await Promise.all([
                getRoleEmbedding(profile, userId),
                getJobEmbeddings(candidates),
              ]);

              if (roleEmb && jobEmbMap.size) {
                send({ type: 'progress', message: 'Refining matches semantically...' });
                const updates = [];
                for (const j of candidates) {
                  const jobEmb = jobEmbMap.get(jobKey(j));
                  if (!jobEmb || !j.apply_url) continue;
                  const rescored = await calculatePandaScore(
                    { ...j, __precomputedJobEmb: jobEmb, __precomputedRoleEmb: roleEmb },
                    profile,
                    preferences,
                    {}
                  );
                  if (rescored?.score != null) {
                    updates.push({ apply_url: j.apply_url, score: rescored.score, breakdown: rescored });
                  }
                }
                if (updates.length) {
                  send({ type: 'rerank', jobs: updates });
                  diag.reranked = updates.length;
                }
              }
            }
          } catch (e) {
            console.warn('[RERANK] semantic pass failed:', e.message);
          }

          // Final complete event with deduped totals
          send({
            type: 'complete',
            totalRaw: result.totalRaw,
            totalUnique: result.jobs.length,
            sources: result.sources,
            queries: result.queries,
            roleAnchor: result.roleAnchor,
            dominantPlatform: result.dominantPlatform,
          });

          // Flush all match-log writes before closing stream
          await Promise.all(_logPromises);

          // Emit a structured diagnostic event for Railway logs and Sentry.
          diag.durationMs = Date.now() - diag.startMs;
          diag.totalRaw = result.totalRaw;
          diag.totalUnique = result.jobs.length;
          diag.queries = result.queries;
          diag.roleAnchor = result.roleAnchor;
          diag.accessMode = 'included';
          // Aggregate totals
          diag.totals = Object.values(diag.sources).reduce((acc, s) => {
            acc.fetched += s.fetched; acc.displayed += s.displayed; acc.discarded += s.discarded; acc.zero += s.zero;
            return acc;
          }, { fetched: 0, displayed: 0, discarded: 0, zero: 0 });
          console.log(JSON.stringify({ event: 'scan_diagnostic', userId: userId || 'anon', headline: profile.headline, ...diag }));

          Sentry.captureMessage('scan_diagnostic', {
            level: 'info',
            tags: {
              headline: profile.headline?.slice(0, 60),
              roleAnchor: result.roleAnchor,
              userId: userId || 'anon',
            },
            extra: {
              topDisplayed: diag.topDisplayed,
              topDiscarded: diag.topDiscarded,
              killers: diag.killers,
              totals: diag.totals,
              sources: diag.sources,
              queries: diag.queries,
              durationMs: diag.durationMs,
              llmFamily: profile._llmFamily || null,
              llmAntiFamilies: profile._llmAntiFamilies || null,
            },
          });

          // Save alert profile for daily job alerts (fire-and-forget)
          if (userId) {
              saveAlertProfile(userId, profile, preferences).catch(() => {});
          }

          controller.close();
        } catch (err) {
          console.error('Stream error:', err);
          Sentry.captureException(err, { tags: { headline: profile.headline?.slice(0, 60) } });
          send({ type: 'error', message: 'Search failed. Please try again.' });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (e) {
    console.error('Match jobs stream error:', e);
    return new Response(JSON.stringify({ error: 'Search failed. Please try again.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
