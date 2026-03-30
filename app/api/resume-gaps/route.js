import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';
import { callSonnet, parseJSON } from '@/lib/sonnet';

export const maxDuration = 30;

export async function POST(request) {
  try {
    const { userId } = await auth();
    const rateLimitId = userId || request.headers.get('x-forwarded-for') || 'anonymous';

    const rl = await rateLimit(`resume-gaps:${rateLimitId}`, 5, 3600);
    if (!rl.allowed) return NextResponse.json({ error: 'Free limit reached, try again later' }, { status: 429, headers: { 'Retry-After': rl.retryAfter } });

    const { profile, targetJobs } = await request.json();

    if (!profile || !targetJobs?.length) {
      return NextResponse.json({ error: 'Profile and target jobs are required' }, { status: 400 });
    }

    const profileSummary = [
      `Headline: ${profile.headline || 'N/A'}`,
      `Skills: ${(profile.skills || []).slice(0, 20).join(', ')}`,
      `Experience: ${profile.experience || 'N/A'}`,
      `What I Do: ${profile.whatIDo || 'N/A'}`,
    ].join('\n');

    const jobsSummary = (targetJobs || []).slice(0, 20).map((j, i) =>
      `${i + 1}. ${j.title || '?'} @ ${j.company || '?'} — Keywords: ${(j.keywords || j.skills || []).slice(0, 5).join(', ')}`
    ).join('\n');

    const prompt = `You are a resume reviewer who understands ATS systems and recruiter psychology.

Rules:
- Focus on the delta between what the user presents and what their target jobs demand.
- Be specific: don't say "add more technical skills." Say "add Kubernetes — it appears in 14 of 20 jobs you're targeting."
- Cap at 5 missing skills, 3 wording improvements, 2 red flags.

USER PROFILE / RESUME:
${profileSummary}

TOP 20 TARGET JOBS (what they want):
${jobsSummary}

Respond with ONLY valid JSON in this exact format:
{
  "missing_high_impact": [
    {
      "skill": "string",
      "appears_in": "X of 20 target jobs",
      "recommendation": "how to add this (reframe experience, course, project)",
      "priority": "critical|recommended|nice_to_have"
    }
  ],
  "wording_improvements": [
    { "current": "from their profile", "suggested": "better version", "reason": "why" }
  ],
  "red_flags": [
    { "issue": "string", "impact": "string", "fix": "string" }
  ],
  "overall_readiness": "1-2 sentence assessment",
  "readiness_score": 65
}

Note: readiness_score is a number 0-100.`;

    const raw = await callSonnet(prompt, { maxTokens: 700, temperature: 0.6 });
    const result = parseJSON(raw);

    return NextResponse.json(result);
  } catch (e) {
    console.error('Resume gaps error:', e);
    return NextResponse.json({ error: 'Failed to analyze resume gaps. Please try again.' }, { status: 500 });
  }
}
