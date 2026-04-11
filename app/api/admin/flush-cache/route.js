import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/tokens';
import { flushJobCache } from '@/lib/cache';

export async function POST() {
    try {
        const { userId } = await auth();
        if (!userId || !(await isAdmin(userId))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const result = await flushJobCache();
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
