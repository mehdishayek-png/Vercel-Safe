import { redis } from './redis.js';
import { currentUser } from '@clerk/nextjs/server';
import { warn, error as logError } from './logger.js';

const TOKEN_PACK_SIZE = 50;

/**
 * Get the Redis key for a user's token balance
 */
function tokenKey(userId) {
    return `user:${userId}:tokens`;
}

/**
 * Get the Redis key for a user's vesting schedule (sorted set)
 * Members: "{releaseTimestamp}:{amount}", score: releaseTimestamp (Unix seconds)
 */
function vestKey(userId) {
    return `user:${userId}:vest_schedule`;
}

/**
 * Grant tokens with daily vesting.
 * Splits totalAmount across days (1 per day), starting from now.
 * Day 0 releases immediately; subsequent days release 24h apart.
 */
export async function grantVestedTokens(userId, totalAmount = 3, days = 3) {
    if (!redis || !userId || totalAmount <= 0 || days <= 0) return { success: false };
    try {
        const now = Math.floor(Date.now() / 1000);
        const perDay = Math.floor(totalAmount / days);
        const remainder = totalAmount % days;
        const pipeline = redis.pipeline();

        for (let i = 0; i < days; i++) {
            const amount = perDay + (i === 0 ? remainder : 0);
            if (amount <= 0) continue;
            const releaseAt = now + i * 86400;
            // Member format: "{releaseAt}:{amount}" — unique per day per grant
            pipeline.zadd(vestKey(userId), { score: releaseAt, member: `${releaseAt}:${amount}` });
        }
        await pipeline.exec();
        return { success: true };
    } catch (err) {
        logError('grantVestedTokens error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Atomically release any vested tokens that are due (score ≤ now).
 * Credits the user's token balance and removes the entries from the schedule.
 * Returns the number of tokens released.
 */
export async function releaseVestedTokens(userId) {
    if (!redis || !userId) return 0;
    try {
        const now = Math.floor(Date.now() / 1000);
        const released = await redis.eval(
            `local due = redis.call('ZRANGEBYSCORE', KEYS[2], '-inf', ARGV[1])
             if #due == 0 then return 0 end
             local total = 0
             for i = 1, #due do
                 local member = due[i]
                 local _, _, amt = string.find(member, ':(%d+)$')
                 total = total + (tonumber(amt) or 0)
             end
             if total > 0 then
                 redis.call('INCRBY', KEYS[1], total)
             end
             redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', ARGV[1])
             return total`,
            [tokenKey(userId), vestKey(userId)],
            [String(now)]
        );
        return typeof released === 'number' ? released : 0;
    } catch (err) {
        warn('releaseVestedTokens error:', err);
        return 0;
    }
}

/**
 * Get the pending (not yet released) vesting schedule for a user.
 * Returns an array of { amount, releaseAt (ISO string) } objects.
 */
export async function getPendingVests(userId) {
    if (!redis || !userId) return [];
    try {
        const now = Math.floor(Date.now() / 1000);
        // Upstash zrange WITHSCORES returns flat interleaved array [member, score, member, score, ...]
        const raw = await redis.zrange(vestKey(userId), now + 1, '+inf', {
            byScore: true,
            withScores: true,
        });
        if (!raw || raw.length === 0) return [];
        const result = [];
        for (let i = 0; i < raw.length; i += 2) {
            const member = String(raw[i]);
            const score = Number(raw[i + 1]);
            const match = member.match(/:(\d+)$/);
            const amount = match ? parseInt(match[1], 10) : 0;
            if (amount > 0) result.push({ amount, releaseAt: new Date(score * 1000).toISOString() });
        }
        return result;
    } catch (err) {
        warn('getPendingVests error:', err);
        return [];
    }
}

/**
 * Get the token balance for a user.
 * For new users: grants 3 starter tokens vested 1/day (1 now, 1 tomorrow, 1 day after).
 * For existing users: releases any vested tokens due before reading the balance.
 * Falls back to 0 if Redis is unavailable.
 */
export async function getTokenBalance(userId) {
    if (!redis || !userId) return { tokens: 0, source: 'local' };
    try {
        const key = tokenKey(userId);
        const balance = await redis.get(key);

        if (balance === null) {
            // New user — Clerk IDs start with "user_", anonymous are IP strings
            const isRealUser = typeof userId === 'string' && userId.startsWith('user_');
            const totalGrant = isRealUser ? 3 : 1;

            if (isRealUser && totalGrant > 1) {
                // Vest: 1 now + rest spread over subsequent days
                await grantVestedTokens(userId, totalGrant, totalGrant);
                await releaseVestedTokens(userId); // release day-0 token immediately
            } else {
                // Anonymous or single token: credit directly, no vesting overhead
                await redis.set(key, totalGrant);
            }

            const fresh = await redis.get(key);
            return { tokens: parseInt(fresh || '0', 10), source: 'server' };
        }

        // Existing user — release any vested tokens that have come due
        await releaseVestedTokens(userId);
        const updated = await redis.get(key);
        return { tokens: parseInt(updated ?? balance, 10), source: 'server' };
    } catch (err) {
        warn('Redis getTokenBalance error:', err);
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
        logError('Redis creditTokens error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Deduct a token from a user's balance (atomic — no race conditions)
 * Uses Lua script to check-and-deduct in a single Redis round-trip.
 * Returns { success, balance } or { success: false, error }
 */
export async function deductToken(userId, amount = 1) {
    if (!redis || !userId) return { success: false, error: 'Redis unavailable or no user' };
    try {
        const key = tokenKey(userId);
        // Atomic check-and-deduct
        const result = await redis.eval(
            `local c = redis.call('GET', KEYS[1])
             if c == false then
                 c = 0
             else
                 c = tonumber(c)
             end
             if c < tonumber(ARGV[1]) then return -1 end
             return redis.call('DECRBY', KEYS[1], ARGV[1])`,
            [key], [amount]
        );

        if (result === -1) {
            const current = parseInt(await redis.get(key) || '0', 10);
            return { success: false, error: 'Insufficient tokens', balance: current };
        }
        return { success: true, balance: result };
    } catch (err) {
        logError('Redis deductToken error:', err);
        return { success: false, error: err.message };
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
            warn('Error fetching currentUser for admin check:', e);
        }
    }
    return false;
}

/**
 * Check if a user can perform a scan.
 * No free scans allowed.
 * Returns { allowed, isFree, tokenCost, tokensRemaining, error, paywalled }
 */
export async function canScan(userId, midasSearch = false) {
    if (!userId) {
        return { allowed: false, error: 'Sign in to use Midas Match.', requiresAuth: true };
    }

    if (!redis) {
        return { allowed: false, error: 'Service temporarily unavailable. Please try again later.' };
    }

    if (await isAdmin(userId)) {
        return {
            allowed: true,
            isFree: true,
            tokenCost: 0,
            tokensRemaining: 9999,
            source: 'admin'
        };
    }

    // Midas Search — 2 tokens
    if (midasSearch) {
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
            error: 'Super Scan requires 2 tokens. Please purchase a package to continue.',
            paywalled: true,
            source: 'server'
        };
    }

    // Normal scan — 1 token
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
        error: 'Standard search requires 1 token. Please purchase a package to continue.',
        paywalled: true,
        source: 'server'
    };
}

export { TOKEN_PACK_SIZE, vestKey };
