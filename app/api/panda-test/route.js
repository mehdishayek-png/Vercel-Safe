import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';
import { calculatePandaScore } from '../../../lib/panda-matcher';

export async function POST(req) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rl = await rateLimit(`panda-test:${userId}`, 30, 60);
        if (!rl.allowed) {
            return NextResponse.json({
                error: `Too many requests. Try again in ${rl.retryAfter} seconds.`
            }, { status: 429 });
        }

        const body = await req.json();
        const { job, profile, preferences } = body;

        if (!job || !profile) {
            return NextResponse.json({ error: 'Missing job or profile data' }, { status: 400 });
        }

        const result = await calculatePandaScore(job, profile, preferences);

        return NextResponse.json({ result });
    } catch (error) {
        console.error('Panda Test API Error:', error);
        return NextResponse.json({ error: 'Failed to run Panda analysis' }, { status: 500 });
    }
}
