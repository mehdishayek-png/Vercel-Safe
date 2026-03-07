// =============================================================================
// MIDAS FEATURE FLAGS
// =============================================================================
// Two-tier flag system:
//   1. Environment variables (deploy-time, instant revert via Vercel dashboard)
//   2. Upstash Redis overrides (runtime, no redeploy needed)
//
// Priority: Redis override > env var > hardcoded default (false)
//
// To kill all advanced filters instantly:
//   Option A: Set NEXT_PUBLIC_FF_ADVANCED_FILTERS=false in Vercel → redeploy
//   Option B: redis-cli SET ff:ADVANCED_FILTERS "false" → instant, no redeploy
// =============================================================================

import { Redis } from '@upstash/redis';
import { DEFAULT_FEATURE_FLAGS } from './filters.js';

// ---------------------------------------------------------------------------
// Redis client (lazy init, only used server-side)
// ---------------------------------------------------------------------------

let _redis = null;

function getRedis() {
    if (!_redis) {
        if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
            return null; // Redis not configured — flags fall back to env/defaults
        }
        _redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    }
    return _redis;
}

// ---------------------------------------------------------------------------
// Environment variable reader
// ---------------------------------------------------------------------------

function readEnvFlag(key) {
    const envKey = `NEXT_PUBLIC_FF_${key}`;
    const val = process.env[envKey];
    if (val === undefined || val === '') return null;
    return val === 'true' || val === '1';
}

// ---------------------------------------------------------------------------
// Redis override reader (server-side only)
// ---------------------------------------------------------------------------

async function readRedisFlag(key) {
    const redis = getRedis();
    if (!redis) return null;
    try {
        const val = await redis.get(`ff:${key}`);
        if (val === null || val === undefined) return null;
        return val === 'true' || val === '1';
    } catch (err) {
        // Redis down? Fall through to env/default. Never block on flag infra.
        console.warn(`[FeatureFlags] Redis read failed for ff:${key}:`, err);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Public API: Get all flags (server-side, async)
// ---------------------------------------------------------------------------

export async function getFeatureFlags() {
    const flags = { ...DEFAULT_FEATURE_FLAGS };

    for (const key of Object.keys(flags)) {
        // Layer 2: environment variable override
        const envVal = readEnvFlag(key);
        if (envVal !== null) flags[key] = envVal;

        // Layer 3: Redis runtime override (highest priority)
        const redisVal = await readRedisFlag(key);
        if (redisVal !== null) flags[key] = redisVal;
    }

    // Master kill switch: if ADVANCED_FILTERS is false, force all sub-flags off
    if (!flags.ADVANCED_FILTERS) {
        flags.SALARY_FILTER = false;
        flags.COMPANY_SIZE_FILTER = false;
        flags.MULTI_REGION = false;
    }

    return flags;
}

// ---------------------------------------------------------------------------
// Public API: Get single flag (server-side, async)
// ---------------------------------------------------------------------------

export async function getFlag(key) {
    const flags = await getFeatureFlags();
    return flags[key] ?? false;
}

// ---------------------------------------------------------------------------
// Public API: Get flags (client-side, sync — env vars only, no Redis)
// ---------------------------------------------------------------------------

export function getClientFeatureFlags() {
    const flags = { ...DEFAULT_FEATURE_FLAGS };

    for (const key of Object.keys(flags)) {
        const envVal = readEnvFlag(key);
        if (envVal !== null) flags[key] = envVal;
    }

    if (!flags.ADVANCED_FILTERS) {
        flags.SALARY_FILTER = false;
        flags.COMPANY_SIZE_FILTER = false;
        flags.MULTI_REGION = false;
    }

    return flags;
}

// ---------------------------------------------------------------------------
// Admin: Set a runtime override (call from admin API route)
// ---------------------------------------------------------------------------

export async function setFlagOverride(key, value) {
    const redis = getRedis();
    if (!redis) throw new Error('Redis not configured');
    await redis.set(`ff:${key}`, value ? 'true' : 'false');
}

// ---------------------------------------------------------------------------
// Admin: Clear a runtime override (reverts to env/default)
// ---------------------------------------------------------------------------

export async function clearFlagOverride(key) {
    const redis = getRedis();
    if (!redis) throw new Error('Redis not configured');
    await redis.del(`ff:${key}`);
}
