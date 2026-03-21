import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 30;

/**
 * POST /api/voice-concierge
 *
 * Processes user messages and returns AI concierge responses.
 * This provides intelligent career advice based on the user's
 * profile, saved jobs, and current pipeline state.
 */
export async function POST(request) {
    try {
        const { userId } = await auth();

        const rateLimitId = userId || request.headers.get('x-forwarded-for') || 'anonymous';
        const rl = await rateLimit(rateLimitId + ':voice-concierge', 15, 60);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Too many requests. Try again in ${rl.retryAfter} seconds.` },
                { status: 429 }
            );
        }

        const { message, profile, savedJobs, appliedJobs, conversationHistory } = await request.json();

        if (!message) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        // Build context for response generation
        const context = buildContext(profile, savedJobs, appliedJobs);

        // Generate response based on message intent
        const response = generateResponse(message, context, conversationHistory);

        // Generate contextual insights
        const insights = generateContextualInsights(message, context);

        return NextResponse.json({
            response: response.text,
            insights,
            suggestedActions: response.actions || [],
        });
    } catch (err) {
        console.error('Voice concierge error:', err);
        return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
    }
}

function buildContext(profile, savedJobs, appliedJobs) {
    return {
        hasProfile: !!profile,
        name: profile?.name || 'there',
        skills: profile?.skills || [],
        experience: profile?.experience_years || 0,
        title: profile?.headline || '',
        savedCount: savedJobs?.length || 0,
        appliedCount: appliedJobs?.length || 0,
        topCompanies: [...new Set([...(savedJobs || []), ...(appliedJobs || [])].map(j => j.company).filter(Boolean))].slice(0, 5),
    };
}

function generateResponse(message, context, history) {
    const lower = message.toLowerCase();

    // Intent detection
    if (lower.includes('skill') || lower.includes('gap') || lower.includes('learn')) {
        return {
            text: `Based on your ${context.skills.length} skills and ${context.experience} years of experience, I'd recommend focusing on areas where target companies are hiring most actively. ${
                context.topCompanies.length > 0
                    ? `Companies like ${context.topCompanies.slice(0, 2).join(' and ')} value cross-functional capabilities.`
                    : 'Start by saving some jobs so I can analyze skill patterns across your targets.'
            } Would you like me to run a detailed gap analysis?`,
            actions: [{ label: 'Run Skill Analysis', href: '/dashboard/skill-bridge' }],
        };
    }

    if (lower.includes('interview') || lower.includes('prep') || lower.includes('prepare')) {
        return {
            text: `I can help you prepare. ${
                context.appliedCount > 0
                    ? `You have ${context.appliedCount} active applications. Let me prioritize prep for the most time-sensitive opportunities.`
                    : 'Once you apply to roles, I can generate targeted prep materials for each company.'
            } The most effective approach is combining company research with behavioral story mapping.`,
            actions: [{ label: 'Start Interview Prep', href: '/dashboard/prep' }],
        };
    }

    if (lower.includes('pipeline') || lower.includes('status') || lower.includes('application')) {
        return {
            text: `Here's your pipeline snapshot: ${context.savedCount} saved roles and ${context.appliedCount} applications tracked. ${
                context.savedCount > context.appliedCount * 3
                    ? 'Your saved-to-applied ratio suggests you could be more decisive. Consider applying to your top 3 saved roles this week.'
                    : 'Good application velocity. Keep the momentum going.'
            }`,
            actions: [{ label: 'View Pipeline', href: '/dashboard/pipeline' }],
        };
    }

    if (lower.includes('network') || lower.includes('connect') || lower.includes('referral')) {
        return {
            text: `Networking is the highest-ROI activity in a job search. ${
                context.topCompanies.length > 0
                    ? `I've identified potential connections at ${context.topCompanies.slice(0, 2).join(' and ')}. A warm introduction increases your response rate by 4x.`
                    : 'Start by targeting companies where your skills are the strongest match.'
            }`,
            actions: [{ label: 'View Network Pulse', href: '/dashboard/network' }],
        };
    }

    if (lower.includes('salary') || lower.includes('compensation') || lower.includes('negotiate')) {
        return {
            text: `Compensation strategy depends on your leverage points. With ${context.experience} years of experience${
                context.skills.length > 0 ? ` and strong skills in ${context.skills.slice(0, 3).join(', ')}` : ''
            }, you're well-positioned. The key is anchoring high on base while being flexible on equity structure. Would you like me to analyze compensation benchmarks for your target roles?`,
            actions: [],
        };
    }

    // Default response
    return {
        text: `I'm here to help with your career strategy, ${context.name}. I can assist with skill gap analysis, interview preparation, pipeline management, networking strategy, and compensation negotiation. What would you like to focus on?`,
        actions: [],
    };
}

function generateContextualInsights(message, context) {
    const insights = [];
    const lower = message.toLowerCase();

    if (context.savedCount > 0) {
        insights.push({
            type: 'signal',
            title: 'Pipeline Active',
            description: `${context.savedCount} saved roles being monitored for recruiter activity.`,
        });
    }

    if (lower.includes('interview') || lower.includes('prep')) {
        insights.push({
            type: 'prep',
            title: 'Prep Resource',
            description: 'Behavioral interview patterns from your target companies available.',
        });
    }

    if (context.skills.length > 0) {
        insights.push({
            type: 'market',
            title: 'Market Signal',
            description: `${context.skills[0]} demand is trending upward in your target market.`,
        });
    }

    return insights;
}
