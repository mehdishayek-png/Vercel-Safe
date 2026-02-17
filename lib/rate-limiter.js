// lib/rate-limiter.js — Persistent rate limiting with Upstash Redis
// Falls back to in-memory if Redis env vars aren't configured yet
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let ratelimit = null;
let fallbackMap = new Map();

function getRateLimiter() {
    if (ratelimit) return ratelimit;

    // Use Upstash Redis if configured (persistent across cold starts)
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        ratelimit = new Ratelimit({
            redis,
            // Sliding window: 2 requests per 60 minutes
            limiter: Ratelimit.slidingWindow(2, '60 m'),
            analytics: true,
            prefix: 'jobbot:ratelimit',
        });

        console.log('[RATE_LIMIT] Using Upstash Redis (persistent)');
        return ratelimit;
    }

    console.warn('[RATE_LIMIT] No Upstash Redis configured — using in-memory fallback (resets on cold start)');
    return null;
}

/**
 * Check rate limit for an IP + action combination
 * @param {string} ip - Client IP address
 * @param {string} action - Action name (e.g., 'search')
 * @returns {{ allowed: boolean, remaining: number, retryAfterSeconds: number }}
 */
export async function checkRateLimit(ip, action) {
    const limiter = getRateLimiter();
    const identifier = `${ip}:${action}`;

    // Upstash Redis path (persistent)
    if (limiter) {
        const result = await limiter.limit(identifier);
        return {
            allowed: result.success,
            remaining: result.remaining,
            retryAfterSeconds: result.success ? 0 : Math.ceil((result.reset - Date.now()) / 1000)
        };
    }

    // In-memory fallback
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxRequests = 2;
    const entry = fallbackMap.get(identifier);

    if (!entry || now - entry.windowStart > windowMs) {
        fallbackMap.set(identifier, { count: 1, windowStart: now });
        return { allowed: true, remaining: maxRequests - 1, retryAfterSeconds: 0 };
    }

    if (entry.count < maxRequests) {
        entry.count++;
        return { allowed: true, remaining: maxRequests - entry.count, retryAfterSeconds: 0 };
    }

    const retryAfterMs = windowMs - (now - entry.windowStart);
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
}

/**
 * Extract client IP from Next.js request
 */
export function getClientIP(request) {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        '127.0.0.1'
    );
}
