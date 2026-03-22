import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 20;

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const rl = await rateLimit(`skill-bridge:${userId}`, 20, 3600);
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

    const { profile, targetJob } = await request.json();
    if (!profile?.skills?.length) return NextResponse.json({ error: 'Profile with skills required.' }, { status: 400 });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API not configured.' }, { status: 500 });

    const prompt = `You are a career skills analyst. Analyze the gap between a candidate's current skills and the requirements of a target job.

Candidate Profile:
- Role: ${profile.headline || 'Not specified'}
- Experience: ${profile.experience_years || 'Not specified'} years
- Current Skills: ${(profile.skills || []).join(', ')}
- Industry: ${profile.industry || 'Not specified'}

Target Job:
- Title: ${targetJob?.title || 'General career advancement'}
- Company: ${targetJob?.company || 'Target company'}
- Description: ${(targetJob?.description || targetJob?.summary || '').slice(0, 1500)}

Analyze the skill gap and return ONLY valid JSON:
{
  "coreMatch": 75,
  "skills": [
    {
      "name": "Skill Name",
      "level": 85,
      "gap": 15,
      "status": "strong|developing|missing",
      "category": "technical|leadership|domain"
    }
  ],
  "bridgeActions": [
    {
      "type": "course|project|mentorship",
      "title": "Specific actionable recommendation",
      "description": "Why this helps bridge the gap (1-2 sentences)",
      "estimatedWeeks": 2
    }
  ],
  "estimatedWeeksToTarget": 6,
  "summary": "One-sentence summary of the candidate's readiness"
}

Return 5-8 skills with honest assessments. coreMatch should reflect actual alignment (don't inflate).
bridgeActions should have exactly 3 items: one course, one project, one mentorship recommendation.
Be specific about what's missing and how to address it.`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://midasmatch.com',
        'X-Title': 'Midas',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0.3,
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    let text = (data.choices?.[0]?.message?.content || '').trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Failed to parse response');

    const result = JSON.parse(match[0]);
    return NextResponse.json(result);
  } catch (e) {
    console.error('Skill bridge error:', e);
    return NextResponse.json({ error: 'Failed to analyze skills.' }, { status: 500 });
  }
}
