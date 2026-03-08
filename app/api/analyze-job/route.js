import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDeepScanCount, incrementDeepScan, deductToken, FREE_DEEP_SCANS, isAdmin as checkIsAdmin } from '@/lib/tokens';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 30;

export async function POST(request) {
    try {
        const { userId } = await auth();

        const adminUser = await checkIsAdmin(userId);

        // Rate limiting — 30 requests per minute per user
        if (!adminUser) {
            const rateLimitId = userId || request.headers.get('x-forwarded-for') || 'anonymous';
            const rl = await rateLimit(rateLimitId, 30, 60);
            if (!rl.allowed) {
                return NextResponse.json({
                    error: `Too many requests. Try again in ${rl.retryAfter} seconds.`
                }, { status: 429 });
            }
        }

        // Server-side deep scan enforcement — applies to ALL users
        if (!userId) {
            return NextResponse.json({
                error: 'Sign in to use Deep Scan.',
                requiresAuth: true
            }, { status: 401 });
        }


        if (!adminUser) {
            const usedCount = await getDeepScanCount(userId);
            if (usedCount >= FREE_DEEP_SCANS) {
                // Past free limit — need tokens
                const deducted = await deductToken(userId, 1);
                if (!deducted.success) {
                    return NextResponse.json({
                        error: 'No tokens remaining for deep scans. Purchase tokens to continue.',
                        paywalled: true
                    }, { status: 403 });
                }
            } else {
                await incrementDeepScan(userId);
            }
        }

        const { job, profile, apiKeys } = await request.json();

        // Check for OpenRouter Key First
        const openRouterKey = apiKeys?.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
        const openAiKey = apiKeys?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;

        let apiUrl = 'https://api.openai.com/v1/chat/completions';
        let apiKey = openAiKey;
        let model = 'gpt-4o-mini';
        let headers = {
            'Content-Type': 'application/json',
        };

        if (openRouterKey) {
            apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
            apiKey = openRouterKey;
            model = 'anthropic/claude-3.5-sonnet'; // Claude 3.5 Sonnet - Best reasoning for career-critical decisions
            headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://midasmatch.com'; // Required by OpenRouter
            headers['X-Title'] = 'Midas';
        }

        if (!apiKey) {
            console.error('Analysis failed: Missing API Key (OpenAI or OpenRouter)');
            return NextResponse.json({ error: 'API key missing. Please check your settings.' }, { status: 400 });
        }

        headers['Authorization'] = `Bearer ${apiKey}`;

        console.log(`[Analysis] Starting analysis using ${openRouterKey ? 'OpenRouter' : 'OpenAI'} for job: ${job.title}`);

        const prompt = `
        Role: Expert Career Coach & Recruiter.
        Task: Analyze the fit between a candidate and a job description.

        Candidate Profile:
        Headline: ${profile.headline}
        Experience Years: ${profile.experience_years || 'Not specified'} (THIS IS THE AUTHORITATIVE NUMBER — use this for ALL experience comparisons, do NOT infer a different number from context)
        Skills: ${profile.skills.join(', ')}
        
        Job Description:
        Title: ${job.title}
        Company: ${job.company}
        Location: ${job.location}
        Summary: ${job.summary || job.description}
        
        CRITICAL INSTRUCTIONS - READ CAREFULLY:

        0. **EXPERIENCE YEARS** (MANDATORY):
           - The candidate's experience is EXACTLY ${profile.experience_years || 0} years. This number was set by the user.
           - Do NOT override, guess, or infer a different number from the resume or any other context.
           - All experience gap calculations MUST use this number.

        1. **BRUTAL EXPERIENCE GAP RULE** (STRICT):
           - If job requires MORE than 5 years beyond candidate's ${profile.experience_years || 0} years, set "fit_score" = 20.
           - Example: Job needs "15+ years", candidate has 6 years → fit_score = 20.
           - Example: Job needs "10+ years", candidate has 5 years → fit_score = 30.
           - Example: Job needs "8+ years", candidate has 6 years → fit_score = 55.

        2. **SENIORITY CHECK** (STRICT):
           - If job title contains "Senior", "Sr.", "Lead", "Director", "VP", "Principal" AND candidate has <8 years → fit_score MUST be <40.
           - If job title contains "Manager" or "Supervisor" AND candidate has <6 years → fit_score MUST be <50.
           - Manager/Supervisor roles typically require 6-8+ years for team leadership, strategy, and cross-functional ownership.
        
        3. **SKILL GAPS** (LENIENT - VERY IMPORTANT):
           - Missing 1-3 skills? **Ignore it.** People learn on the job.
           - Only penalize if candidate is from a COMPLETELY different domain (e.g. construction → software).
           - Focus scoring on **experience match**, not skill match.
        
        4. **FIT SCORE SCALE**: 
           - 80-100: Perfect match (Experience aligned, domain correct).
           - 60-79: Good match (Minor experience gap OR different tech stack in same domain).
           - 40-59: Weak match (Noticeable experience gap).
           - 0-39: REJECT (Experience gap >5 years, wrong seniority tier).

        Output JSON ONLY:
        {
            "fit_score": 85, // Integer 0-100.
            "strong_signals": ["Signal 1", "Signal 2"], // Specific skills/exp that match well
            "gaps": ["Gap 1"], // Missing skills or requirements (be gentle but honest)
            "salary_estimate": "Estimated Ranges (e.g. $120k - $150k)", // Estimate based on role/location/company tiers
            "verdict": "One sentence summary of why they should apply (or why NOT)."
        }
        `;


        // Build request body
        const requestBody = {
            model: model,
            messages: [{ role: 'user', content: prompt }]
        };

        // Only add response_format for OpenAI models (Gemini doesn't support it)
        if (!openRouterKey || model.includes('gpt')) {
            requestBody.response_format = { type: "json_object" };
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const analysis = JSON.parse(data.choices[0].message.content);

        return NextResponse.json({ analysis });

    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 });
    }
}
