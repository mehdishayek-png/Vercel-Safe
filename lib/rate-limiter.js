// lib/rate-limiter.js — In-memory IP-based rate limiter for Vercel serverless
// Note: In-memory Map resets on cold start. For persistent limits, use Vercel KV.

const rateLimitMap = new Map();

// Clean up old entries every 10 minutes
const CLEANUP_INTERVAL = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;

    for (const [key, entry] of rateLimitMap) {
        if (now - entry.windowStart > entry.windowMs) {
            rateLimitMap.delete(key);
        }
    }
}

/**
 * Check rate limit for an IP + action combination
 * @param {string} ip - Client IP address
 * @param {string} action - Action name (e.g., 'search', 'cover-letter')
 * @param {number} maxRequests - Max requests allowed in window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{ allowed: boolean, remaining: number, retryAfterSeconds: number }}
 */
export function checkRateLimit(ip, action, maxRequests, windowMs) {
    cleanup();

    const key = `${ip}:${action}`;
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    // No existing entry - first request
    if (!entry) {
        rateLimitMap.set(key, { count: 1, windowStart: now, windowMs });
        return { allowed: true, remaining: maxRequests - 1, retryAfterSeconds: 0 };
    }

    // Window expired - reset
    if (now - entry.windowStart > windowMs) {
        rateLimitMap.set(key, { count: 1, windowStart: now, windowMs });
        return { allowed: true, remaining: maxRequests - 1, retryAfterSeconds: 0 };
    }

    // Within window
    if (entry.count < maxRequests) {
        entry.count++;
        return { allowed: true, remaining: maxRequests - entry.count, retryAfterSeconds: 0 };
    }

    // Rate limited
    const retryAfterMs = windowMs - (now - entry.windowStart);
    return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000)
    };
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
