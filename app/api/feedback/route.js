import { auth } from '@clerk/nextjs/server';
import { trackInteraction, getFeedbackStats } from '@/lib/feedback-tracker';
import { z } from 'zod';

const FeedbackSchema = z.object({
    job: z.object({
        title: z.string(),
        company: z.string(),
    }).passthrough(),
    action: z.enum(['click', 'save', 'apply', 'dismiss', 'skip']),
    pandaScore: z.number().min(0).max(100),
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

        const { job, action, pandaScore, profile } = result.data;
        await trackInteraction(userId, job, action, pandaScore, profile);

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
