import { NextResponse } from 'next/server';
import { isDbEnabled, query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    const startedAt = Date.now();
    const checks = {
        app: 'ok',
        database: isDbEnabled() ? 'checking' : 'not_configured',
    };

    if (isDbEnabled()) {
        try {
            await Promise.race([
                query('SELECT 1 AS ready', [], { throwOnError: true }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('database health timeout')), 4_000)),
            ]);
            checks.database = 'ok';
        } catch {
            checks.database = 'error';
        }
    }

    const healthy = checks.database === 'ok';
    return NextResponse.json({
        status: healthy ? 'ok' : 'unavailable',
        checks,
        responseMs: Date.now() - startedAt,
        release: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null,
        timestamp: new Date().toISOString(),
    }, {
        status: healthy ? 200 : 503,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
}
