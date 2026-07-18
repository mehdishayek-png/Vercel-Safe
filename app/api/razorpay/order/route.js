import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { validateOrigin } from '@/lib/csrf';

export async function POST(request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!validateOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });

    return NextResponse.json({
        error: 'Purchases are currently paused because product access is included.',
        access: 'included',
    }, { status: 409 });
}
