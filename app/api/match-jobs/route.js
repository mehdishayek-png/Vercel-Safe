// app/api/match-jobs/route.js
import { NextResponse } from 'next/server';
import { fetchAllJobs } from '@/lib/job-fetcher';
import { matchJobs } from '@/lib/matcher';
import { matchJobsEnhanced } from '@/lib/matcher-enhanced';
import { checkRateLimit, getClientIP } from '@/lib/rate-limiter';

export const maxDuration = 60;

export async function POST(request) {
  try {
    // Rate limiting (persistent via Upstash Redis)
    const ip = getClientIP(request);
    const { allowed, remaining, retryAfterSeconds } = await checkRateLimit(ip, 'search');

    if (!allowed) {
      const minutes = Math.ceil(retryAfterSeconds / 60);
      return NextResponse.json({
        error: `Rate limit reached. You can search again in ${minutes} minute${minutes !== 1 ? 's' : ''}. This helps us keep JobBot free for everyone.`,
        retryAfter: retryAfterSeconds,
        rateLimited: true
      }, {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSeconds) }
      });
    }

    const { profile, apiKeys, preferences, useEnhanced } = await request.json();

    if (!profile || !profile.skills?.length) {
      return NextResponse.json({ error: 'Profile with skills required' }, { status: 400 });
    }

    const logs = [];
    const onProgress = (msg) => logs.push(msg);

    // Fetch jobs with preferences
    const { jobs, sources } = await fetchAllJobs(profile, apiKeys, onProgress, preferences);

    // Match - use enhanced matcher if requested and OpenAI key is available
    let matches;
    const hasOpenAI = apiKeys.OPENAI_API_KEY || process.env.OPENAI_API_KEY;

    if (useEnhanced && hasOpenAI) {
      onProgress('Using enhanced matching engine (semantic + multi-signal scoring)...');
      matches = await matchJobsEnhanced(jobs, profile, apiKeys, onProgress);
    } else {
      if (useEnhanced && !hasOpenAI) {
        onProgress('⚠️ Enhanced matching requires OPENAI_API_KEY, falling back to standard matcher');
      }
      matches = await matchJobs(jobs, profile, apiKeys, onProgress);
    }

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
