import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { deductToken, isAdmin as checkIsAdmin } from '@/lib/tokens';
import { rateLimit } from '@/lib/rate-limit';
import { callFlash, parseJSON } from '@/lib/sonnet';

export const maxDuration = 30;

export async function POST(request) {
    try {
        const { userId } = await auth();
        const adminUser = await checkIsAdmin(userId);

        const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
        const effectiveUserId = userId || ip;

        if (!adminUser) {
            const rl = await rateLimit(`outreach:${effectiveUserId}`, 20, 60);
            if (!rl.allowed) {
                return NextResponse.json({ error: `Too many requests. Try again in ${rl.retryAfter} seconds.` }, { status: 429 });
            }

            const deducted = await deductToken(effectiveUserId, 1);
            if (!deducted.success) {
                return NextResponse.json({
                    error: userId ? 'Not enough tokens. Purchase more to use Cold Outreach.' : 'You have used your free token. Sign in to get more!',
                    paywalled: !!userId,
                    requiresAuth: !userId
                }, { status: userId ? 403 : 401 });
            }
        }

        const { job, profile } = await request.json();

        const prompt = `
You are an expert tech recruiter and networking coach. 
Write 3 highly effective cold outreach messages for the candidate to send on LinkedIn or email to the hiring manager or a peer engineer.

Candidate Profile:
Name: ${profile.name || 'Candidate'}
Headline: ${profile.headline || 'Professional'}
Experience: ${profile.experience_years || 0} years
Key Skills: ${(profile.skills || []).slice(0, 5).join(', ')}

Target Job:
Title: ${job.title}
Company: ${job.company}
Summary: ${(job.summary || job.description || '').slice(0, 1000)}

Rules:
1. Don't use [Company Name] or [Insert Skill] placeholders. Resolve them with the data provided. Use logical assumptions.
2. Keep them brief! 
3. Output MUST be valid JSON.

JSON EXACT SCHEMA:
{
    "messages": [
        {
            "type": "short_punchy",
            "title": "Short & Punchy (For busy founders/VPs)",
            "content": "Message content here..."
        },
        {
            "type": "value_add",
            "title": "The Value Add (Pitching a solution)",
            "content": "Message content here..."
        },
        {
            "type": "referral_ask",
            "title": "The Referral Ask (For peer engineers/PMs)",
            "content": "Message content here..."
        }
    ]
}
`;

        const raw = await callFlash(prompt, { maxTokens: 800, temperature: 0.7 });
        const result = parseJSON(raw);

        return NextResponse.json({ messages: result.messages });
    } catch (error) {
        console.error('Outreach error:', error);
        return NextResponse.json({ error: 'Outreach generation failed. Please try again.' }, { status: 500 });
    }
}
