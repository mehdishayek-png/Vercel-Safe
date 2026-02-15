// app/api/parse-resume/route.js
import { NextResponse } from 'next/server';
import { parseResumePDF } from '@/lib/resume-parser';

export const maxDuration = 30;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const apiKey = formData.get('apiKey');

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    if (!apiKey) return NextResponse.json({ error: 'No API key provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const profile = await parseResumePDF(buffer, apiKey);

    return NextResponse.json({ profile });
  } catch (e) {
    console.error('Parse resume error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
