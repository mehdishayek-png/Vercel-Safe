// app/api/match-jobs/route.js
import { NextResponse } from 'next/server';
import { fetchAllJobs } from '@/lib/job-fetcher';
import { matchJobs } from '@/lib/matcher';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { profile, apiKeys } = await request.json();

    if (!profile || !profile.skills?.length) {
      return NextResponse.json({ error: 'Profile with skills required' }, { status: 400 });
    }

    const logs = [];
    const onProgress = (msg) => logs.push(msg);

    // Fetch jobs
    const { jobs, sources } = await fetchAllJobs(profile, apiKeys, onProgress);

    // Match
    const matches = await matchJobs(jobs, profile, apiKeys, onProgress);

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
