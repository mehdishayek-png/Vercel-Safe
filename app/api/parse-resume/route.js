import { NextResponse } from 'next/server';
import { parseResumePDF } from '@/lib/resume-parser';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 30;

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
    const apiKey = formData.get('apiKey');

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    // if (!apiKey) return NextResponse.json({ error: 'No API key provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const profile = await parseResumePDF(buffer, apiKey);

    return NextResponse.json({ profile });
  } catch (e) {
    console.error('Parse resume error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
