import { auth } from '@clerk/nextjs/server';
import { fetchAllJobsStreaming } from '@/lib/job-fetcher';
import { calculatePandaScore } from '@/lib/panda-matcher';
import { canScan, incrementDailyScan, deductToken } from '@/lib/tokens';
import { rateLimit } from '@/lib/rate-limit';
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

    // Deduct: free scan or token
    if (!scanCheck.adminPass) {
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

          send({ type: 'progress', message: 'Starting job search...' });

          const onSourceComplete = async (sourceName, jobs) => {
            send({ type: 'progress', message: `Fetching ${sourceName}...` });

            // Score each job with Panda immediately
            const scoredJobs = await Promise.all(
              jobs.map(async (job) => {
                try {
                  const score = await calculatePandaScore(job, profile, preferences, {});
                  return { ...job, pandaScore: score };
                } catch {
                  return { ...job, pandaScore: null };
                }
              })
            );

            sourceCounts[sourceName] = scoredJobs.length;

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

          controller.close();
        } catch (err) {
          send({ type: 'error', message: err.message || 'An unexpected error occurred during streaming.' });
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
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
