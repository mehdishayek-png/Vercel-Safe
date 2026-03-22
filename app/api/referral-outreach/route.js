import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 20;

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const rl = await rateLimit(`referral:${userId}`, 20, 3600);
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

    const { profile, job, referralContext } = await request.json();
    if (!job?.title) return NextResponse.json({ error: 'Job details required.' }, { status: 400 });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API not configured.' }, { status: 500 });

    const prompt = `You are an expert at professional networking and referral strategy. Help craft a warm referral request message and analyze the referral opportunity.

Candidate:
- Name: ${profile?.name || 'Not specified'}
- Role: ${profile?.headline || 'Not specified'}
- Experience: ${profile?.experience_years || 'Not specified'} years
- Skills: ${(profile?.skills || []).slice(0, 10).join(', ')}
- Industry: ${profile?.industry || 'Not specified'}
${profile?.whatIDo ? `- What they do: ${profile.whatIDo}` : ''}

Target Role:
- Title: ${job.title}
- Company: ${job.company || 'Target company'}
- Location: ${job.location || 'Not specified'}
- Description: ${(job.description || job.summary || '').slice(0, 1000)}

${referralContext ? `Additional context: ${referralContext}` : ''}

Generate a referral strategy. Return ONLY valid JSON:
{
  "outreachMessage": "A warm, personalized referral request message (3-4 short paragraphs). Professional but not stiff. Reference specific skills that match the role. Don't be generic.",
  "emailSubject": "Short email subject line for the referral request",
  "strategy": {
    "conversionLikelihood": 75,
    "steps": [
      "Step 1: Specific action to take",
      "Step 2: Next action",
      "Step 3: Follow-up action"
    ],
    "keyStrengthsToHighlight": ["Strength 1", "Strength 2", "Strength 3"],
    "potentialObjections": ["One concern the referrer might have and how to address it"]
  },
  "alternativeApproaches": [
    {"channel": "LinkedIn", "approach": "Specific LinkedIn approach"},
    {"channel": "Email", "approach": "Specific email approach"}
  ]
}

Make the outreach message feel authentic, not template-y. Reference real aspects of the candidate's background that match the target role.`;

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
        temperature: 0.5,
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
    console.error('Referral outreach error:', e);
    return NextResponse.json({ error: 'Failed to generate outreach.' }, { status: 500 });
  }
}
