/**
 * Match Logs Ring Buffer — production-side log capture for scoring debugging.
 *
 * POST: append a log entry (called from lib/debug/match-logger.js on Vercel)
 * GET:  drain entries (pulled by scripts/pull-match-logs.mjs to local disk)
 *
 * Stored in module-scoped memory — survives across requests within a single
 * lambda instance, lost on cold start. That's fine for short-term debugging:
 * the local sync script polls every few minutes.
 */

import { NextResponse } from 'next/server';

const MAX_BUFFER = 5000;
const buffer = [];

function authorized(request) {
    const expected = process.env.MATCH_LOGS_TOKEN;
    if (!expected) return true; // no token configured = open in dev
    const provided = request.headers.get('x-debug-token');
    return provided === expected;
}

export async function POST(request) {
    if (!authorized(request)) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    try {
        const entry = await request.json();
        buffer.push(entry);
        if (buffer.length > MAX_BUFFER) {
            buffer.splice(0, buffer.length - MAX_BUFFER);
        }
        return NextResponse.json({ ok: true, size: buffer.length });
    } catch {
        return NextResponse.json({ error: 'bad payload' }, { status: 400 });
    }
}

export async function GET(request) {
    if (!authorized(request)) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const url = new URL(request.url);
    const drain = url.searchParams.get('drain') === '1';

    const entries = buffer.slice();
    if (drain) {
        buffer.length = 0;
    }
    return NextResponse.json({ count: entries.length, entries });
}
