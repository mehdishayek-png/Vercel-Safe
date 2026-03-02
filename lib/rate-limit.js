import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

/**
 * Simple sliding-window rate limiter using Redis.
 * @param {string} identifier - Unique identifier (userId or IP)
 * @param {number} maxRequests - Max requests allowed in the window
 * @param {number} windowSeconds - Time window in seconds
 * @returns {{ allowed: boolean, remaining: number, retryAfter?: number }}
 */
export async function rateLimit(identifier, maxRequests = 10, windowSeconds = 60) {
    if (!redis || !identifier) {
        // No Redis = no rate limiting (fail open for development)
        return { allowed: true, remaining: maxRequests };
    }

    const key = `ratelimit:${identifier}`;

    try {
        const current = await redis.incr(key);

        // Set TTL on first request in this window
        if (current === 1) {
            await redis.expire(key, windowSeconds);
        }

        if (current > maxRequests) {
            const ttl = await redis.ttl(key);
            return {
                allowed: false,
                remaining: 0,
                retryAfter: ttl > 0 ? ttl : windowSeconds,
            };
        }

        return {
            allowed: true,
            remaining: maxRequests - current,
        };
    } catch (err) {
        console.warn('Rate limit check failed:', err);
        // Fail open — don't block users if Redis has a hiccup
        return { allowed: true, remaining: maxRequests };
    }
}
