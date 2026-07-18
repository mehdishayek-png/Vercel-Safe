import { auth } from '@clerk/nextjs/server';
import { trackInteraction, getFeedbackStats } from '@/lib/feedback-tracker';
import { recordSearchOutcome } from '@/lib/search-telemetry';
import { z } from 'zod';

const FeedbackSchema = z.object({
    job: z.object({
        title: z.string(),
        company: z.string(),
    }).passthrough(),
    action: z.enum(['click', 'save', 'apply', 'dismiss', 'skip']),
    pandaScore: z.number().min(0).max(100),
    eventId: z.string().max(100).optional(),
    rank: z.number().int().positive().max(5000).optional(),
    profile: z.object({
        headline: z.string().optional().default(''),
    }).passthrough().optional().default({}),
});

export async function POST(request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new Response(JSON.stringify({ error: 'Auth required' }), {
                status: 401, headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await request.json();
        const result = FeedbackSchema.safeParse(body);
        if (!result.success) {
            return new Response(JSON.stringify({ error: 'Invalid payload' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const { job, action, pandaScore, profile, eventId, rank } = result.data;
        const writes = [trackInteraction(userId, job, action, pandaScore, profile)];
        if (['click', 'dismiss', 'skip'].includes(action)) {
            writes.push(recordSearchOutcome({ eventId, userId, job, action, score: pandaScore, rank }));
        }
        await Promise.all(writes);

        return new Response(JSON.stringify({ ok: true }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('[FEEDBACK API]', err);
        return new Response(JSON.stringify({ error: 'Failed to record feedback' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
}

// Admin: GET /api/feedback — returns global stats
export async function GET(request) {
    try {
        const { userId } = await auth();
        const adminIds = (process.env.ADMIN_USER_IDS || '').split(',');
        if (!adminIds.includes(userId)) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
                status: 403, headers: { 'Content-Type': 'application/json' },
            });
        }

        const stats = await getFeedbackStats();
        return new Response(JSON.stringify({ stats }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: 'Failed to fetch stats' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
}
