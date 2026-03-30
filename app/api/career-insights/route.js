import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';
import { callSonnet, parseJSON } from '@/lib/sonnet';

export const maxDuration = 30;

export async function POST(request) {
  try {
    const { userId } = await auth();
    const rateLimitId = userId || request.headers.get('x-forwarded-for') || 'anonymous';

    const rl = await rateLimit(`career-insights:${rateLimitId}`, 5, 3600);
    if (!rl.allowed) return NextResponse.json({ error: 'Free limit reached, try again later' }, { status: 429, headers: { 'Retry-After': rl.retryAfter } });

    const { profile, savedJobs, recentScanJobs } = await request.json();

    if (!profile || !savedJobs?.length) {
      return NextResponse.json({ error: 'Profile and saved jobs are required' }, { status: 400 });
    }

    const profileSummary = [
      `Headline: ${profile.headline || 'N/A'}`,
      `Skills: ${(profile.skills || []).slice(0, 20).join(', ')}`,
      `Experience: ${profile.experience || 'N/A'}`,
      `Location: ${profile.location || 'N/A'}`,
    ].join('\n');

    const savedSummary = (savedJobs || []).slice(0, 20).map((j, i) =>
      `${i + 1}. ${j.title || '?'} @ ${j.company || '?'} — Skills: ${(j.skills || []).slice(0, 5).join(', ')}`
    ).join('\n');

    const skippedSummary = (recentScanJobs || []).slice(0, 20).map((j, i) =>
      `${i + 1}. ${j.title || '?'} @ ${j.company || '?'}`
    ).join('\n');

    const prompt = `You are a career pattern analyst. Analyze the gap between what this user says they want (their profile) and what they actually do (save, skip, apply patterns).

Rules:
- Every insight must cite at least 3 specific jobs from the data.
- Tone: curious and helpful, not judgmental.
- Max 3 insights.

USER PROFILE:
${profileSummary}

LAST 20 SAVED JOBS (what they actually want):
${savedSummary}

LAST 20 SCAN RESULTS NOT SAVED (what they skipped):
${skippedSummary || 'No skipped job data available'}

Respond with ONLY valid JSON in this exact format:
{
  "insights": [
    {
      "type": "profile_drift|hidden_preference|search_refinement|contradiction",
      "observation": "what the data shows",
      "suggestion": "what to do about it",
      "evidence": ["Job 1 title @ Company", "Job 2 title @ Company", "Job 3 title @ Company"],
      "action": { "type": "update_profile|adjust_search|explore_role|none", "details": "string" }
    }
  ],
  "search_health": "on_track|needs_adjustment|unfocused",
  "one_liner": "1 sentence summary of the biggest insight"
}`;

    const raw = await callSonnet(prompt, { maxTokens: 600, temperature: 0.7 });
    const result = parseJSON(raw);

    return NextResponse.json(result);
  } catch (e) {
    console.error('Career insights error:', e);
    return NextResponse.json({ error: 'Failed to generate career insights. Please try again.' }, { status: 500 });
  }
}
