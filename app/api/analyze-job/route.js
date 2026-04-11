import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDeepScanCount, incrementDeepScan, deductToken, FREE_DEEP_SCANS, isAdmin as checkIsAdmin } from '@/lib/tokens';
import { rateLimit } from '@/lib/rate-limit';
import { callSonnet, parseJSON } from '@/lib/sonnet';
import { logMatch } from '@/lib/debug/match-logger';

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

        // Server-side deep scan enforcement
        // During beta: allow anonymous users with IP-based rate limiting
        if (userId && !adminUser) {
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

        console.log(`[Analysis] Starting deep analysis for job: ${job.title}`);

        const prompt = `
You are a senior career advisor who speaks like a trusted friend — direct, warm, and specific.
Never say generic things like "good match based on skills." Always cite the exact skill, experience, or signal.
Speak to the user as "you/your."

Task: Analyze the fit between this candidate and job, then return structured JSON.

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

5. **VERDICT MAPPING**:
   - fit_score 85-100 → verdict = "strong_match"
   - fit_score 65-84 → verdict = "good_match"
   - fit_score 45-64 → verdict = "stretch_match"
   - fit_score 25-44 → verdict = "weak_match"
   - fit_score 0-24 → verdict = "misaligned"

Output JSON ONLY (no markdown, no explanation outside JSON):
{
    "verdict": "strong_match|good_match|stretch_match|weak_match|misaligned",
    "fit_score": 85,
    "summary": "2-3 sentence frank assessment speaking directly to the user (you/your). Cite specific skills and signals.",
    "strong_signals": [{ "signal": "React + TypeScript", "explanation": "Their stack is exactly what this team ships in" }],
    "concerns": [{ "concern": "No cloud-native experience", "severity": "minor|notable|serious", "mitigation": "Take the AWS practitioner cert before applying" }],
    "hidden_opportunity": "Something non-obvious about why this role could be great, or null if nothing stands out",
    "salary_read": { "estimated_range": "Estimated salary range in LOCAL CURRENCY based on job location. Use the correct currency symbol for the job's country.", "leverage_notes": "What gives the candidate negotiating power" },
    "application_advice": "1-2 sentences on whether to apply and how to position yourself",
    "gaps": ["Gap 1"],
    "salary_estimate": "Same value as salary_read.estimated_range — flat string for backward compat",
    "tldr": "2-line plain English summary of the job. What the role does, what kind of company, and the key requirement. No jargon."
}

IMPORTANT for backward compatibility:
- "strong_signals" MUST be an array of objects with "signal" and "explanation" keys.
- "gaps" MUST be a flat array of strings listing missing skills or requirements (be gentle but honest).
- "salary_estimate" MUST be a flat string with the estimated salary range in local currency.
- "verdict" MUST be one of: strong_match, good_match, stretch_match, weak_match, misaligned.
- "tldr" MUST be a flat string.
`;

        const raw = await callSonnet(prompt, { maxTokens: 1500, temperature: 0.6 });
        const analysis = parseJSON(raw);

        // Backward compatibility: frontend renders strong_signals as flat strings
        // Preserve rich objects as strong_signals_detail, flatten for the frontend
        if (Array.isArray(analysis.strong_signals) && analysis.strong_signals.length > 0 && typeof analysis.strong_signals[0] === 'object') {
            analysis.strong_signals_detail = analysis.strong_signals;
            analysis.strong_signals = analysis.strong_signals.map(s => s.signal || String(s));
        }

        // Debug logging — capture the detail-view AI verdict so we can compare
        // it against the list-score Panda result for the same job. The job arg
        // here came from the frontend and may carry match_score / heuristic_breakdown.
        logMatch({
            stage: 'detail_view',
            profile,
            job,
            pandaScore: job?.match_score ?? null,
            pandaBreakdown: job?.heuristic_breakdown ?? null,
            llmScore: null,
            aiVerdict: analysis,
            combinedScore: job?.match_score ?? null,
            notes: 'click_through_analysis',
        });

        return NextResponse.json({ analysis });

    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 });
    }
}
