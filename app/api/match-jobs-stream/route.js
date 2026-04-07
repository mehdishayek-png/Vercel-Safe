import { auth } from '@clerk/nextjs/server';
import { fetchAllJobsStreaming } from '@/lib/job-fetcher';
import { calculatePandaScore } from '@/lib/panda-matcher';
import { canScan, incrementDailyScan, deductToken } from '@/lib/tokens';
import { rateLimit } from '@/lib/rate-limit';
import { saveAlertProfile } from '@/lib/job-alerts';
import { detectGhostSignals } from '@/lib/ghost-detector';
import { analyzeJobQuality } from '@/lib/jd-quality';
import { predictSalary } from '@/lib/salary-predictor';
import { predictSuccessProbability } from '@/lib/success-predictor';
import { z } from 'zod';

export const maxDuration = 90;

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
  // ---- Auth, rate-limit, token checks (same as /api/match-jobs) ----
  try {
    const { userId } = await auth();

    const rateLimitId = userId || request.headers.get('x-forwarded-for') || 'anonymous';
    const rl = await rateLimit(rateLimitId, 10, 60);

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

    // Structured log for beta monitoring
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    console.log(JSON.stringify({
      event: 'scan_started',
      userId: userId || 'anonymous',
      ip: ip.split(',')[0].trim(),
      headline: profile.headline?.slice(0, 60),
      skills: profile.skills?.slice(0, 5),
      location: profile.location,
      midasSearch: preferences?.midasSearch || false,
      timestamp: new Date().toISOString(),
    }));

    const scanCheck = await canScan(userId, preferences?.midasSearch);
    if (!scanCheck.allowed) {
      return new Response(JSON.stringify({
        error: scanCheck.error,
        requiresAuth: scanCheck.requiresAuth || false,
        paywalled: !scanCheck.requiresAuth,
      }), {
        status: scanCheck.requiresAuth ? 401 : 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Deduct: free scan or token (skip for anonymous beta users)
    if (!scanCheck.adminPass && !scanCheck.anonymousPass) {
      if (scanCheck.isFree) {
        if (scanCheck.isMidasSearchFree) {
          await import('@/lib/tokens').then(m => m.incrementWeeklyMidasScan(userId));
        } else {
          await incrementDailyScan(userId);
        }
      } else {
        const deducted = await deductToken(userId, scanCheck.tokenCost || 1);
        if (!deducted.success) {
          return new Response(JSON.stringify({ error: 'Failed to deduct token' }), {
            status: 403, headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }

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
            topDisplayed: [],   // top 10 jobs >= 30
            topDiscarded: [],   // top 10 jobs in 15-29 range (almost-good)
            killers: {},        // counts of which multipliers killed jobs
          };

          send({ type: 'progress', message: 'Starting job search...' });

          const onSourceComplete = async (sourceName, jobs) => {
            send({ type: 'progress', message: `Fetching ${sourceName}...` });

            const sourceDiag = { fetched: jobs.length, scored: 0, displayed: 0, discarded: 0, zero: 0 };

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
                  if (s >= 30) {
                    sourceDiag.displayed++;
                    if (diag.topDisplayed.length < 10) {
                      diag.topDisplayed.push({ s, t: job.title?.slice(0, 60), c: job.company, src: sourceName });
                    }
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
                      const killer = killers.join(',') || 'low_raw';
                      diag.topDiscarded.push({ s, t: job.title?.slice(0, 60), c: job.company, src: sourceName, killer });
                      diag.killers[killer] = (diag.killers[killer] || 0) + 1;
                    }
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

          // Emit comprehensive diagnostic log — single line, structured JSON, reliably captured by Vercel
          diag.durationMs = Date.now() - diag.startMs;
          diag.totalRaw = result.totalRaw;
          diag.totalUnique = result.jobs.length;
          diag.queries = result.queries;
          diag.roleAnchor = result.roleAnchor;
          // Aggregate totals
          diag.totals = Object.values(diag.sources).reduce((acc, s) => {
            acc.fetched += s.fetched; acc.displayed += s.displayed; acc.discarded += s.discarded; acc.zero += s.zero;
            return acc;
          }, { fetched: 0, displayed: 0, discarded: 0, zero: 0 });
          console.log(JSON.stringify({ event: 'scan_diagnostic', userId: userId || 'anon', headline: profile.headline, ...diag }));

          // Save alert profile for daily job alerts (fire-and-forget)
          if (userId) {
              saveAlertProfile(userId, profile, preferences).catch(() => {});
          }

          controller.close();
        } catch (err) {
          console.error('Stream error:', err);
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
