import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 15;

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await rateLimit(`cover-letter:${userId}`, 15, 3600); // 15 per hour max
    if (!rl.allowed) return NextResponse.json({ error: 'Free limit reached, try tomorrow' }, { status: 429, headers: { 'Retry-After': rl.retryAfter } });

    const { job, profile } = await request.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 400 });

    const skills = (profile.skills || []).slice(0, 20).join(', ');

    const prompt = `Write a concise, tailored cover letter.

Rules:
- 2 paragraphs, 70-90 words
- Professional but human tone
- No placeholders or template language
- Focus on relevant skills and experience

Candidate:
Name: ${profile.name || 'Candidate'}
Headline: ${profile.headline || 'Professional'}
Skills: ${skills}

Job:
Title: ${job.title || '?'}
Company: ${job.company || '?'}
Description: ${(job.summary || '').slice(0, 1500)}

Write the cover letter:`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 250,
      }),
    });

    const data = await res.json();
    let letter = (data.choices?.[0]?.message?.content || '').trim();
    letter = letter.replace(/\[Your Name\]/g, profile.name || 'Candidate');
    letter = letter.replace(/\[Company Name\]/g, job.company || '');

    return NextResponse.json({ letter });
  } catch (e) {
    console.error('Cover letter error:', e);
    return NextResponse.json({ error: 'Failed to generate cover letter. Please try again.' }, { status: 500 });
  }
}
