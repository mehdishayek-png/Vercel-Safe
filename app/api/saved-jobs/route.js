import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { Redis } from '@upstash/redis';
import { sendApplicationConfirmation } from '@/lib/email';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

function savedJobsKey(userId) {
    return `user:${userId}:saved_jobs`;
}

// GET — fetch saved jobs
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!redis) return NextResponse.json({ jobs: [], source: 'local' });

    try {
        const data = await redis.get(savedJobsKey(userId));
        return NextResponse.json({ jobs: data || [], source: 'server' });
    } catch (err) {
        console.error('Failed to fetch saved jobs:', err);
        return NextResponse.json({ jobs: [], source: 'local' });
    }
}

// POST — save/unsave a job (toggle)
export async function POST(request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!redis) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

    try {
        const { job, action } = await request.json();
        const key = savedJobsKey(userId);
        let current = (await redis.get(key)) || [];

        if (action === 'save') {
            // Prevent duplicates
            if (!current.some(j => j.apply_url === job.apply_url)) {
                current.push(job);
            }
        } else if (action === 'unsave') {
            current = current.filter(j => j.apply_url !== job.apply_url);
        }

        // Cap at 200 saved jobs to prevent unbounded growth
        if (current.length > 200) current = current.slice(-200);

        await redis.set(key, current);

        // Fire-and-forget application confirmation email
        if (action === 'apply' || (action === 'save' && job?.type === 'applied')) {
            currentUser().then(user => {
                const email = user?.emailAddresses?.[0]?.emailAddress;
                if (email) {
                    sendApplicationConfirmation(email, user?.firstName || 'there', job).catch(() => {});
                }
            }).catch(() => {});
        }

        return NextResponse.json({ success: true, count: current.length });
    } catch (err) {
        console.error('Failed to save job:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
