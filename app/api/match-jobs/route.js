import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchAllJobs } from '@/lib/job-fetcher';
import { matchJobs } from '@/lib/matcher';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Please sign in to use the search agent.' }, { status: 401 });
    }

    const { profile, apiKeys, preferences } = await request.json();

    if (!profile || !profile.skills?.length) {
      return NextResponse.json({ error: 'Profile with skills required' }, { status: 400 });
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
