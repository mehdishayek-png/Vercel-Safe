import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query, isDbEnabled } from '@/lib/db';
import { validateOrigin } from '@/lib/csrf';

// Server-side persistence for the user's CV-extracted profile, so it survives
// device changes and localStorage clears. API keys are intentionally NOT stored
// here — they remain device-local in the browser.

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isDbEnabled()) return NextResponse.json({ profile: null, source: 'local' });

    try {
        const rows = await query('SELECT data FROM profiles WHERE user_id = $1', [userId], { throwOnError: true });
        return NextResponse.json({ profile: rows[0]?.data ?? null, source: 'server' });
    } catch (err) {
        console.error('Failed to load profile:', err);
        return NextResponse.json({ profile: null, source: 'local' });
    }
}

export async function POST(request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!validateOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    if (!isDbEnabled()) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

    try {
        const { profile } = await request.json();
        if (!profile || typeof profile !== 'object') {
            return NextResponse.json({ error: 'Invalid profile' }, { status: 400 });
        }

        await query('INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [userId], { throwOnError: true });
        // Only update the data column — leave role_emb/role_emb_hash (managed by
        // the scan's embedding cache) untouched.
        await query(
            `INSERT INTO profiles (user_id, data, updated_at) VALUES ($1, $2, now())
             ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
            [userId, profile], { throwOnError: true });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Failed to save profile:', err);
        return NextResponse.json({ error: 'Failed to save profile.' }, { status: 500 });
    }
}
