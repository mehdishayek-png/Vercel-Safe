import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redis } from '@/lib/redis';
import { sendApplicationConfirmation } from '@/lib/email';
import { validateOrigin } from '@/lib/csrf';

function savedJobsKey(userId) {
    return `user:${userId}:saved_jobs`;
}

function appliedJobsKey(userId) {
    return `user:${userId}:applied_jobs`;
}

// GET — fetch saved jobs, or applied jobs when ?type=applied
export async function GET(request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!redis) return NextResponse.json({ jobs: [], source: 'local' });

    const type = new URL(request.url).searchParams.get('type');
    const key = type === 'applied' ? appliedJobsKey(userId) : savedJobsKey(userId);

    try {
        const data = await redis.get(key);
        return NextResponse.json({ jobs: data || [], source: 'server' });
    } catch (err) {
        console.error('Failed to fetch jobs:', err);
        return NextResponse.json({ jobs: [], source: 'local' });
    }
}

// POST — save/unsave a job (toggle)
export async function POST(request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!validateOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    if (!redis) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

    try {
        const { job, action } = await request.json();
        const isAppliedAction = action === 'apply' || action === 'unapply';
        const key = isAppliedAction ? appliedJobsKey(userId) : savedJobsKey(userId);
        let current = (await redis.get(key)) || [];

        if (action === 'save' || action === 'apply') {
            if (!current.some(j => j.apply_url === job.apply_url)) {
                current.push(action === 'apply' ? { ...job, applied_at: new Date().toISOString() } : job);
            }
        } else if (action === 'unsave' || action === 'unapply') {
            current = current.filter(j => j.apply_url !== job.apply_url);
        }

        // Cap at 200 entries to prevent unbounded growth
        if (current.length > 200) current = current.slice(-200);

        await redis.set(key, current);

        // Fire-and-forget application confirmation email
        if (action === 'apply') {
            currentUser().then(user => {
                const email = user?.emailAddresses?.[0]?.emailAddress;
                if (email) {
                    sendApplicationConfirmation(email, user?.firstName || 'there', job).catch(() => {});
                }
            }).catch(() => {});
        }

        return NextResponse.json({ success: true, count: current.length });
    } catch (err) {
        console.error('Failed to update job:', err);
        return NextResponse.json({ error: 'Failed to update job. Please try again.' }, { status: 500 });
    }
}
