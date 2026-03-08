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

    const profile = await parseResumePDF(buffer, apiKey);

    return NextResponse.json({ profile });
  } catch (e) {
    console.error('Parse resume error:', e);
    return NextResponse.json({ error: 'Failed to parse resume. Please try a different PDF.' }, { status: 500 });
  }
}
