import { NextResponse } from 'next/server';
import { parseResumePDF, extractSearchStrategy } from '@/lib/resume-parser';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 30;

/**
 * Generate a "What I Do" summary from the parsed resume.
 * Uses OpenRouter (Gemini Flash) for speed and cost.
 * Returns a 2-3 sentence description the user can edit.
 */
async function generateWhatIDo(profile) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return '';

  const skills = (profile.skills || []).slice(0, 15).join(', ');
  const headline = profile.headline || '';
  const industry = profile.industry || '';
  const years = profile.experience_years || 0;
  // Use first 1500 chars of resume text for context
  const resumeSnippet = (profile.resume_text || '').slice(0, 1500);

  const prompt = `Based on this resume, write a 2-3 sentence "What I Do" description in first person.
It should describe what the person does day-to-day, what they're good at, and what kind of role they're looking for.
Keep it natural and conversational — not a LinkedIn summary. Max 400 characters.

Resume headline: ${headline}
Industry: ${industry}
Experience: ${years} years
Skills: ${skills}
Resume excerpt: ${resumeSnippet}

Write ONLY the description, nothing else. No quotes, no labels.`;

  try {
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
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return '';
    const data = await res.json();
    const text = (data.choices?.[0]?.message?.content || '').trim();
    // Cap at 500 chars (matches the UI limit)
    return text.slice(0, 500);
  } catch {
    return ''; // Non-blocking — empty is fine, user can fill manually
  }
}

export async function POST(request) {
  try {
    const { userId } = await auth();
    const identifier = userId || request.headers.get('x-forwarded-for') || 'anonymous_parsing';

    // Limits bots, but allows anonymous users a few scans to try the service (or we can enforce strict auth). 
    // Going with 10 free parses per hour.
    const rl = await rateLimit(`parse-resume:${identifier}`, 10, 3600);
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429, headers: { 'Retry-After': rl.retryAfter } });

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    // Validate file type and size
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.type && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }
    // Verify PDF magic bytes (%PDF)
    if (buffer.length < 4 || buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
      return NextResponse.json({ error: 'Invalid PDF file.' }, { status: 400 });
    }

    const profile = await parseResumePDF(buffer);

    // Enrich with search strategy (non-blocking — failures are graceful)
    const strategy = await extractSearchStrategy(profile.resume_text || '', profile);
    if (strategy) {
      profile.search_strategy = strategy;
    }

    // Generate "What I Do" summary from resume text (non-blocking)
    const whatIDo = await generateWhatIDo(profile);

    return NextResponse.json({ profile, whatIDo });
  } catch (e) {
    console.error('Parse resume error:', e);
    // Surface specific error messages from the parser for better user feedback
    const message = e.message?.includes('Could not') || e.message?.includes('No readable text') || e.message?.includes('Could not extract any skills')
      ? e.message
      : 'Failed to parse resume. Please try a different PDF.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
