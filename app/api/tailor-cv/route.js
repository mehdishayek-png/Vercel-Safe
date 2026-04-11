import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { deductToken, isAdmin as checkIsAdmin } from '@/lib/tokens';
import { rateLimit } from '@/lib/rate-limit';
import { callFlash, parseJSON } from '@/lib/sonnet';

export const maxDuration = 45;

export async function POST(request) {
    try {
        const { userId } = await auth();
        const adminUser = await checkIsAdmin(userId);

        if (!adminUser) {
            const rateLimitId = userId || request.headers.get('x-forwarded-for') || 'anonymous';
            const rl = await rateLimit(`tailor-cv:${rateLimitId}`, 10, 60);
            if (!rl.allowed) {
                return NextResponse.json({ error: `Too many requests. Try again in ${rl.retryAfter} seconds.` }, { status: 429 });
            }
        }

        if (userId && !adminUser) {
            // Costs 3 tokens
            const deducted = await deductToken(userId, 3);
            if (!deducted.success) {
                return NextResponse.json({
                    error: 'Tailoring an ATS CV costs 3 tokens. Purchase more to proceed.',
                    paywalled: true
                }, { status: 403 });
            }
        } else if (!userId) {
            return NextResponse.json({ error: 'Please sign in to Tailor a CV.', requiresAuth: true }, { status: 401 });
        }

        const { job, profile } = await request.json();

        // Extract skills and experience for prompt
        const skills = (profile.skills || []).slice(0, 30).join(', ');
        
        const prompt = `
You are an expert ATS (Applicant Tracking System) optimizer and professional resume writer.
I need a tailored CV in markdown format that uniquely aligns the candidate's existing background with the target job's requirements.

Candidate Profile:
Name: ${profile.name || 'Candidate'}
Current Headline: ${profile.headline || 'Professional'}
Experience: ${profile.experience_years || 0} years
Location: ${profile.location || 'Remote'}
Core Skills: ${skills}
What they do: ${profile.whatIDo || 'Experienced professional.'}

Target Job:
Title: ${job.title}
Company: ${job.company}
Summary: ${(job.summary || job.description || '').slice(0, 1500)}

Instructions:
1. Generate an elite, ATS-friendly markdown resume.
2. Structure MUST include: 
   - A highly targeted Professional Summary (2-3 sentences max).
   - Core Competencies / Technical Skills (bulleted, grouped logically, heavily mirroring JD keywords).
   - Professional Experience (Write 3 impressive accomplishments/responsibilities that fit the candidate's stated '${profile.whatIDo || ''}' but are framed to impress the hiring manager for ${job.title}). Use X-Y-Z formula (Achieved X by doing Y resulting in Z). Use real metric placeholders if needed like "[X]%".
3. ONLY OUTPUT VALID JSON. Put the raw markdown string in the "markdown" key.

JSON FORMAT:
{
    "markdown": "# Candidate Name\\n\\n## Professional Summary\\n...",
    "tips": "1 sentence advice on what to edit before generating the PDF."
}
`;

        const raw = await callFlash(prompt, { maxTokens: 1200, temperature: 0.6 });
        const result = parseJSON(raw);

        return NextResponse.json({ 
            cvMarkdown: result.markdown,
            tips: result.tips 
        });
    } catch (error) {
        console.error('Tailor CV error:', error);
        return NextResponse.json({ error: 'Tailored CV generation failed. Please try again.' }, { status: 500 });
    }
}
