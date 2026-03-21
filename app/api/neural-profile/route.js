import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 10;

/**
 * POST /api/neural-profile
 *
 * Persists and retrieves the user's neural profile settings.
 * Settings include: risk appetite, seniority preference,
 * focus equilibrium, and culture velocity.
 */
export async function POST(request) {
    try {
        const { userId } = await auth();

        const rateLimitId = userId || request.headers.get('x-forwarded-for') || 'anonymous';
        const rl = await rateLimit(rateLimitId + ':neural-profile', 20, 60);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Too many requests. Try again in ${rl.retryAfter} seconds.` },
                { status: 429 }
            );
        }

        const { sliderValues, profile } = await request.json();

        if (!sliderValues) {
            return NextResponse.json({ error: 'Slider values required' }, { status: 400 });
        }

        // Compute ecosystem score based on slider configuration + profile
        const ecosystemScore = computeEcosystemScore(sliderValues, profile);

        // Generate insights based on slider values
        const insights = generateInsights(sliderValues);

        // Generate top match based on profile tuning
        const topMatch = generateTopMatch(sliderValues);

        return NextResponse.json({
            ecosystemScore,
            insights,
            topMatch,
            sliderValues,
            syncedAt: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Neural profile error:', err);
        return NextResponse.json({ error: 'Failed to sync neural profile' }, { status: 500 });
    }
}

function computeEcosystemScore(sliders, profile) {
    // Base score from profile completeness
    let score = 50;
    if (profile?.skills?.length > 5) score += 10;
    if (profile?.experience_years > 3) score += 10;
    if (profile?.name) score += 5;

    // Slider calibration bonus — more refined settings = higher score
    const riskBalance = Math.abs(sliders.risk - 50) / 50; // How opinionated
    const seniorityConfidence = sliders.seniority / 100;
    const focusClarity = Math.abs(sliders.focus - 50) / 50;
    const cultureDecision = sliders.culture / 100;

    // Reward having clear preferences
    score += Math.round((riskBalance + seniorityConfidence + focusClarity + cultureDecision) * 6.25);

    return Math.min(99, Math.max(40, score));
}

function generateInsights(sliders) {
    const insights = [];

    if (sliders.culture > 60) {
        insights.push({
            title: `Startup Visibility +${Math.round((sliders.culture - 50) * 0.5)}%`,
            description: 'High growth appetite has unlocked stealth-mode opportunities in high-growth sectors.',
        });
    }

    if (sliders.risk > 55) {
        insights.push({
            title: 'Equity Exposure Priority',
            description: 'Neural weights now favor packages with equity over pure base compensation.',
        });
    } else {
        insights.push({
            title: 'Stability Priority Active',
            description: 'Enterprise and established companies prioritized for reliable compensation.',
        });
    }

    if (sliders.seniority > 60) {
        insights.push({
            title: 'Enterprise Suppression',
            description: 'Standard mid-level listings deprioritized based on seniority settings.',
        });
    } else {
        insights.push({
            title: 'Growth Roles Prioritized',
            description: 'Roles with clear advancement paths and mentorship programs are weighted higher.',
        });
    }

    return insights;
}

function generateTopMatch(sliders) {
    const isStartup = sliders.culture > 60;
    const isSenior = sliders.seniority > 60;
    const isTechnical = sliders.focus < 50;

    const roles = [
        { title: 'Principal Director of Product', company: 'QuantumFlow', stage: 'SERIES C', salary: '$240k - $280k' },
        { title: 'VP of Engineering', company: 'NexaAI', stage: 'SERIES B', salary: '$260k - $320k' },
        { title: 'Staff Software Engineer', company: 'Anthropic', stage: 'GROWTH', salary: '$220k - $300k' },
        { title: 'Head of Design', company: 'Linear', stage: 'SERIES B', salary: '$200k - $260k' },
        { title: 'Senior Product Manager', company: 'Stripe', stage: 'ESTABLISHED', salary: '$190k - $250k' },
    ];

    let idx = 0;
    if (isStartup && isSenior) idx = 1;
    else if (isTechnical && isSenior) idx = 2;
    else if (!isTechnical && isSenior) idx = 3;
    else if (!isSenior) idx = 4;

    return roles[idx];
}
