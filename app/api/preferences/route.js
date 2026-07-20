import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { isDbEnabled, query } from '@/lib/db';
import { validateOrigin } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

const PreferencesSchema = z.object({
    preferences: z.object({
        location: z.string().max(200).optional().default(''),
        remoteOnly: z.boolean().optional().default(false),
    }).passthrough(),
});

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isDbEnabled()) return NextResponse.json({ preferences: null, source: 'local' });

    try {
        const rows = await query('SELECT data FROM user_preferences WHERE user_id = $1', [userId], { throwOnError: true });
        return NextResponse.json({ preferences: rows[0]?.data ?? null, source: 'server' });
    } catch (error) {
        console.error('Failed to load preferences:', error);
        return NextResponse.json({ preferences: null, source: 'local' });
    }
}

export async function POST(request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!validateOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    if (!isDbEnabled()) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

    const parsed = PreferencesSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || JSON.stringify(parsed.data.preferences).length > 20_000) {
        return NextResponse.json({ error: 'Invalid preferences' }, { status: 400 });
    }

    try {
        await query('INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [userId], { throwOnError: true });
        await query(
            `INSERT INTO user_preferences (user_id, data, updated_at) VALUES ($1, $2, now())
             ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
            [userId, parsed.data.preferences], { throwOnError: true },
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to save preferences:', error);
        return NextResponse.json({ error: 'Failed to save preferences.' }, { status: 500 });
    }
}
