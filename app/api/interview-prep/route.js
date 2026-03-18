import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 20;

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const rl = await rateLimit(`interview-prep:${userId}`, 20, 3600);
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

    const { job, profile } = await request.json();
    if (!job?.title) return NextResponse.json({ error: 'Job title required.' }, { status: 400 });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API not configured.' }, { status: 500 });

    const prompt = `You are an expert interview coach. Generate interview preparation for this specific job.

Job Title: ${job.title}
Company: ${job.company || 'Unknown'}
Job Description: ${(job.summary || job.description || '').slice(0, 2000)}

Candidate Profile:
- Current Role: ${profile?.headline || 'Not specified'}
- Experience: ${profile?.experience_years || 'Not specified'} years
- Skills: ${(profile?.skills || []).slice(0, 15).join(', ')}
${profile?.whatIDo ? `- What They Do: ${profile.whatIDo}` : ''}

Generate a comprehensive interview prep package. Return ONLY valid JSON:
{
  "questions": [
    {
      "question": "The interview question",
      "type": "behavioral|technical|situational|culture",
      "difficulty": "easy|medium|hard",
      "why_asked": "Brief reason why they'd ask this (1 sentence)",
      "answer_framework": "How to structure your answer (2-3 sentences with specific things to mention from the candidate's background)"
    }
  ],
  "company_research": {
    "talking_points": ["3-4 things to mention about the company that show you did your homework"],
    "questions_to_ask": ["3 smart questions the candidate should ask the interviewer"]
  },
  "skill_gaps_to_address": ["1-2 potential weaknesses and how to frame them positively"],
  "opening_pitch": "A 30-second elevator pitch tailored to this specific role (written in first person)"
}

Generate exactly 8 questions: 3 behavioral, 2 technical, 2 situational, 1 culture fit.
Make answer frameworks SPECIFIC to this candidate's experience — reference their actual skills and background.`;

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
        temperature: 0.4,
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    const text = (data.choices?.[0]?.message?.content || '').trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Failed to parse response');

    const prep = JSON.parse(match[0]);
    return NextResponse.json({ prep });
  } catch (e) {
    console.error('Interview prep error:', e);
    return NextResponse.json({ error: 'Failed to generate prep. Try again.' }, { status: 500 });
  }
}
