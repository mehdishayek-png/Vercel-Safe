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
 * Get the token balance for a user
 * Falls back to 0 if Redis is unavailable
 */
export async function getTokenBalance(userId) {
    if (!redis || !userId) return { tokens: 0, source: 'local' };
    try {
        const balance = await redis.get(tokenKey(userId));
        return { tokens: parseInt(balance || '0', 10), source: 'server' };
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
        // Atomic check-and-deduct: returns new balance or -1 if insufficient
        const result = await redis.eval(
            `local c = tonumber(redis.call('GET', KEYS[1]) or '0')
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

export { TOKEN_PACK_SIZE };
