import { NextResponse } from 'next/server';
import { calculatePandaScore } from '../../../lib/panda-matcher';

export async function POST(req) {
    try {
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
