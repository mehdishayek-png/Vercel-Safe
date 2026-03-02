import { Redis } from '@upstash/redis';
import { currentUser } from '@clerk/nextjs/server';// Initialize Redis client conditionally
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

const TOKEN_PACK_SIZE = 50;
const FREE_DAILY_SCANS = 3;
const FREE_DEEP_SCANS = 3;

/**
 * Get the Redis key for a user's token balance
 */
function tokenKey(userId) {
    return `user:${userId}:tokens`;
}

function dailyScanKey(userId) {
    const today = new Date().toISOString().slice(0, 10);
    return `user:${userId}:daily_scans:${today}`;
}

function deepScanKey(userId) {
    return `user:${userId}:deep_scans_used`;
}

/**
 * Get the token balance for a user
 * Falls back to 0 if Redis is unavailable
 */
export async function getTokenBalance(userId) {
    if (!redis || !userId) return { tokens: 0, source: 'local' };
    try {
        const balance = await redis.get(tokenKey(userId));
        return { tokens: parseInt(balance || '0', 10), source: 'server' };
    } catch (err) {
        console.warn('Redis getTokenBalance error:', err);
        return { tokens: 0, source: 'local' };
    }
}

/**
 * Credit tokens to a user (after verified payment)
 */
export async function creditTokens(userId, amount = TOKEN_PACK_SIZE) {
    if (!redis || !userId) return { success: false, error: 'Redis unavailable or no user' };
    try {
        const newBalance = await redis.incrby(tokenKey(userId), amount);
        return { success: true, balance: newBalance };
    } catch (err) {
        console.error('Redis creditTokens error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Deduct a token from a user's balance
 * Returns { success, balance } or { success: false, error }
 */
export async function deductToken(userId, amount = 1) {
    if (!redis || !userId) return { success: false, error: 'Redis unavailable or no user' };
    try {
        const current = parseInt(await redis.get(tokenKey(userId)) || '0', 10);
        if (current < amount) {
            return { success: false, error: 'Insufficient tokens', balance: current };
        }
        const newBalance = await redis.decrby(tokenKey(userId), amount);
        return { success: true, balance: newBalance };
    } catch (err) {
        console.error('Redis deductToken error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Get daily scan count for a user (resets daily via key expiry)
 */
export async function getDailyScanCount(userId) {
    if (!redis || !userId) return 0;
    try {
        const count = await redis.get(dailyScanKey(userId));
        return parseInt(count || '0', 10);
    } catch (err) {
        console.warn('Redis getDailyScanCount error:', err);
        return 0;
    }
}

/**
 * Increment daily scan count (auto-expires at end of day via TTL)
 */
export async function incrementDailyScan(userId) {
    if (!redis || !userId) return { success: false };
    try {
        const key = dailyScanKey(userId);
        const count = await redis.incr(key);
        // Set TTL to expire at end of day (max 24h)
        if (count === 1) {
            await redis.expire(key, 86400);
        }
        return { success: true, count };
    } catch (err) {
        console.error('Redis incrementDailyScan error:', err);
        return { success: false };
    }
}

/**
 * Get deep scan usage count for a user
 */
export async function getDeepScanCount(userId) {
    if (!redis || !userId) return 0;
    try {
        const count = await redis.get(deepScanKey(userId));
        return parseInt(count || '0', 10);
    } catch (err) {
        console.warn('Redis getDeepScanCount error:', err);
        return 0;
    }
}

/**
 * Increment deep scan count
 */
export async function incrementDeepScan(userId) {
    if (!redis || !userId) return { success: false };
    try {
        const count = await redis.incr(deepScanKey(userId));
        return { success: true, count };
    } catch (err) {
        console.error('Redis incrementDeepScan error:', err);
        return { success: false };
    }
}

/**
 * Check if a user is an admin based on environment variables
 */
export async function isAdmin(userId) {
    if (!userId) return false;

    // Check by user ID first (fast)
    const adminIds = process.env.ADMIN_USER_IDS ? process.env.ADMIN_USER_IDS.split(',').map(id => id.trim()) : [];
    if (adminIds.includes(userId)) return true;

    // Check by email (slower, requires Clerk API call)
    const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()) : [];
    if (adminEmails.length > 0) {
        try {
            const user = await currentUser();
            if (user && user.emailAddresses) {
                const userEmails = user.emailAddresses.map(e => e.emailAddress.toLowerCase());
                return userEmails.some(email => adminEmails.includes(email));
            }
        } catch (e) {
            console.warn('Error fetching currentUser for admin check:', e);
        }
    }
    return false;
}

/**
 * Check if a user can perform a scan (free or paid)
 * Returns { allowed, isFree, tokensRemaining, freeRemaining }
 */
export async function canScan(userId, superSearch = false) {
    if (!userId) {
        return { allowed: false, error: 'Sign in to scan for jobs.', requiresAuth: true };
    }

    if (!redis) {
        // Redis unavailable — block to prevent abuse rather than allowing unlimited access
        return { allowed: false, error: 'Service temporarily unavailable. Please try again later.' };
    }

    if (await isAdmin(userId)) {
        return {
            allowed: true,
            isFree: true,
            tokenCost: 0,
            freeRemaining: 9999,
            tokensRemaining: 9999,
            source: 'server',
            adminPass: true
        };
    }

    // Super Search ALWAYS costs tokens (no free tier)
    if (superSearch) {
        const tokenCost = 2;
        const { tokens } = await getTokenBalance(userId);
        if (tokens >= tokenCost) {
            return {
                allowed: true,
                isFree: false,
                tokenCost,
                tokensRemaining: tokens - tokenCost,
                source: 'server'
            };
        }
        return {
            allowed: false,
            error: 'Super Search requires 2 tokens. Purchase tokens to continue.',
            source: 'server'
        };
    }

    // Normal scan — check free tier first
    const dailyCount = await getDailyScanCount(userId);

    if (dailyCount < FREE_DAILY_SCANS) {
        return {
            allowed: true,
            isFree: true,
            freeRemaining: FREE_DAILY_SCANS - dailyCount - 1,
            source: 'server'
        };
    }

    // Past free limit — need tokens
    const tokenCost = 1;
    const { tokens } = await getTokenBalance(userId);

    if (tokens >= tokenCost) {
        return {
            allowed: true,
            isFree: false,
            tokenCost,
            tokensRemaining: tokens - tokenCost,
            source: 'server'
        };
    }

    return {
        allowed: false,
        error: 'No free scans remaining today. Purchase tokens to continue.',
        source: 'server'
    };
}

export { FREE_DAILY_SCANS, FREE_DEEP_SCANS, TOKEN_PACK_SIZE };
