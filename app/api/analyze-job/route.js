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

        const { job, profile } = await request.json();

        // Use server-side env vars only — never accept API keys from clients
        const openRouterKey = process.env.OPENROUTER_API_KEY;
        const openAiKey = process.env.OPENAI_API_KEY;

        let apiUrl = 'https://api.openai.com/v1/chat/completions';
        let apiKey = openAiKey;
        let model = 'gpt-4o-mini';
        let headers = {
            'Content-Type': 'application/json',
        };

        if (openRouterKey) {
            apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
            apiKey = openRouterKey;
            model = 'google/gemini-2.5-flash'; // Gemini Flash — 3-5x faster than Sonnet, sufficient for scoring
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
        Skills: ${profile.skills.join(', ')}${profile.whatIDo ? `
        What They Do (in their own words): ${profile.whatIDo}` : ''}
        
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

        3b. **"WHAT THEY DO" INTENT SIGNAL** (IF PROVIDED):
           - If the candidate described what they do day-to-day, use it to judge role alignment.
           - A strong mismatch between what they DO and what the job REQUIRES should lower the score.
           - A strong alignment (even with different terminology) should boost the score.
           - Example: candidate says "I build automated workflows" → "Process Automation Engineer" = great fit even if keywords differ.
        
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
            "salary_estimate": "Estimated salary range in LOCAL CURRENCY based on job location. Use ₹ for India (e.g. ₹8,00,000 - ₹15,00,000 per annum), $ for US (e.g. $120k - $150k), £ for UK, € for Europe. Always match the currency to where the job is located, not the candidate."
            "verdict": "One sentence summary of why they should apply (or why NOT).",
            "tldr": "2-line plain English summary of the job. What the role does, what kind of company, and the key requirement. No jargon. Example: 'Support role at a fintech startup helping enterprise clients onboard. Needs 3+ years CX experience and strong communication skills.'"
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
            signal: AbortSignal.timeout(25000),
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        let rawContent = (data.choices[0].message.content || '').trim();
        // Strip markdown code fences (```json ... ```) that Gemini sometimes wraps around JSON
        // Handle both single-line and multiline fences
        rawContent = rawContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');
        // Fallback: extract JSON object if fences weren't cleanly stripped
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Failed to extract JSON from analysis response');
        const analysis = JSON.parse(jsonMatch[0]);

        return NextResponse.json({ analysis });

    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 });
    }
}
