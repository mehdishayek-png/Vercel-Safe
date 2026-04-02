import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 10;

export async function POST(request) {
  try {
    const { userId } = await auth();
    // Beta: allow anonymous users with IP-based rate limiting
    const identifier = userId || request.headers.get('x-forwarded-for') || 'anonymous';
    const rl = await rateLimit(`search-suggestions:${identifier}`, 10, 60); // 10 per minute
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });

    const { title, skills } = await request.json();
    if (!title) return NextResponse.json({ suggestions: null });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ suggestions: null });

    const prompt = `A job seeker searched for "${title}" with skills: ${(skills || []).slice(0, 10).join(', ')}.
Their search returned very few results.

Suggest exactly 5 alternative job titles they should try. These should be:
- Real job titles that companies actually post (not made-up ones)
- Related to their current search but different enough to find new results
- A mix of: synonyms, adjacent roles, and broader titles

Return ONLY a JSON array of 5 strings, nothing else. Example: ["Product Manager", "Program Manager", "Product Owner", "Technical Product Lead", "Strategy & Operations"]`;

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
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return NextResponse.json({ suggestions: null });

    const data = await res.json();
    const text = (data.choices?.[0]?.message?.content || '').trim();

    // Parse JSON array from response
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return NextResponse.json({ suggestions: null });

    const suggestions = JSON.parse(match[0]);
    if (!Array.isArray(suggestions) || suggestions.length === 0) return NextResponse.json({ suggestions: null });

    return NextResponse.json({ suggestions: suggestions.slice(0, 5) });
  } catch {
    return NextResponse.json({ suggestions: null });
  }
}
