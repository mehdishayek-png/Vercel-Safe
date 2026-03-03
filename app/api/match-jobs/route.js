import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchAllJobs } from '@/lib/job-fetcher';
import { matchJobs } from '@/lib/matcher';
import { canScan, incrementDailyScan, deductToken } from '@/lib/tokens';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 90; // Generous enough for batching, tight enough to catch hangs

export async function POST(request) {
  try {
    const { userId } = await auth();

    // Rate limiting — 10 requests per minute per user
    const rateLimitId = userId || request.headers.get('x-forwarded-for') || 'anonymous';
    const rl = await rateLimit(rateLimitId, 10, 60);

    if (!rl.allowed) {
      const minutes = Math.ceil(rl.retryAfter / 60);
      return NextResponse.json({
        error: `Rate limit reached. You can search again in ${minutes} minute${minutes !== 1 ? 's' : ''}. This helps us keep Midas free for everyone.`,
        retryAfter: rl.retryAfter,
        rateLimited: true
      }, {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfter) }
      });
    }

    const { profile, apiKeys, preferences } = await request.json();

    if (!profile || !profile.skills?.length) {
      return NextResponse.json({ error: 'Profile with skills required' }, { status: 400 });
    }

    // Server-side scan limit enforcement — applies to ALL users
    const scanCheck = await canScan(userId, preferences?.superSearch);
    if (!scanCheck.allowed) {
      return NextResponse.json({
        error: scanCheck.error,
        requiresAuth: scanCheck.requiresAuth || false,
        paywalled: !scanCheck.requiresAuth,
      }, { status: scanCheck.requiresAuth ? 401 : 403 });
    }

    // Deduct: free scan or token
    if (!scanCheck.adminPass) {
      if (scanCheck.isFree) {
        if (scanCheck.isSuperSearchFree) {
          await import('@/lib/tokens').then(m => m.incrementWeeklySuperScan(userId));
        } else {
          await incrementDailyScan(userId);
        }
      } else {
        const deducted = await deductToken(userId, scanCheck.tokenCost || 1);
        if (!deducted.success) {
          return NextResponse.json({ error: 'Failed to deduct token' }, { status: 403 });
        }
      }
    }

    const logs = [];
    const onProgress = (msg) => logs.push(msg);

    // Fetch jobs with preferences
    const { jobs, sources } = await fetchAllJobs(profile, apiKeys, onProgress, preferences);

    // Match using the reliable pipeline (keyword + LLM hybrid)
    const matches = await matchJobs(jobs, profile, apiKeys, onProgress, preferences);

    return NextResponse.json({
      matches,
      total: jobs.length,
      sources,
      logs,
    });
  } catch (e) {
    console.error('Match jobs error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
