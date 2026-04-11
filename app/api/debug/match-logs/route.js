/**
 * Match Logs Ring Buffer — production-side log capture for scoring debugging.
 *
 * POST: append a log entry (called from lib/debug/match-logger.js on Vercel)
 * GET:  drain entries (pulled by scripts/pull-match-logs.mjs to local disk)
 *
 * Backed by Redis to survive across serverless lambda instances.
 * Falls back to in-memory buffer if Redis is unavailable.
 */

import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

const MAX_BUFFER = 5000;
const REDIS_KEY = 'debug_match_logs';

// Fallback for local dev without Redis connection
const memoryBuffer = [];

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
        
        if (redis) {
            // Push to the left of the list
            await redis.lpush(REDIS_KEY, entry);
            // Trim list to strictly maintain max buffer length
            await redis.ltrim(REDIS_KEY, 0, MAX_BUFFER - 1);
            
            // Get approximate size (can just return MAX_BUFFER statically if over limits)
            const size = await redis.llen(REDIS_KEY);
            return NextResponse.json({ ok: true, size, storage: 'redis' });
        } else {
            // Fallback
            memoryBuffer.push(entry);
            if (memoryBuffer.length > MAX_BUFFER) {
                memoryBuffer.splice(0, memoryBuffer.length - MAX_BUFFER);
            }
            return NextResponse.json({ ok: true, size: memoryBuffer.length, storage: 'memory' });
        }
    } catch (e) {
        return NextResponse.json({ error: 'bad payload', msg: e.message }, { status: 400 });
    }
}

export async function GET(request) {
    if (!authorized(request)) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    
    const url = new URL(request.url);
    const drain = url.searchParams.get('drain') === '1';

    if (redis) {
        // Fetch all current entries
        const entries = await redis.lrange(REDIS_KEY, 0, -1);
        
        // If the drain parameter is set, delete the key to flush the queue
        if (drain) {
            await redis.del(REDIS_KEY);
        }
        
        return NextResponse.json({ count: entries.length, entries, storage: 'redis' });
    } else {
        // Fallback
        const entries = memoryBuffer.slice();
        if (drain) {
            memoryBuffer.length = 0;
        }
        return NextResponse.json({ count: entries.length, entries, storage: 'memory' });
    }
}
