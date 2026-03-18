import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { sendWeeklyDigest } from '@/lib/email';

export const maxDuration = 30;

export async function POST(request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await currentUser();
        const email = user?.emailAddresses?.[0]?.emailAddress;
        const firstName = user?.firstName || 'there';

        if (!email) return NextResponse.json({ error: 'No email found' }, { status: 400 });

        const body = await request.json();
        const stats = {
            newMatches: body.newMatches || 0,
            savedCount: body.savedCount || 0,
            appliedCount: body.appliedCount || 0,
            topJobs: body.topJobs || [],
        };

        const result = await sendWeeklyDigest(email, firstName, stats);
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
