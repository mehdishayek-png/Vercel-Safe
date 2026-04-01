import { Redis } from '@upstash/redis';
import { warn } from './logger.js';

// Initialize Redis client conditionally
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

const CACHE_TTL = 3600; // 1 hour in seconds

/**
 * Generate a cache key for job search
 * @param {Object} profile - User profile
 * @param {Object} preferences - User preferences
 * @returns {string} - Cache key
 */
export function generateCacheKey(profile, preferences) {
    const parts = [
        profile.headline || '',
        (profile.skills || []).sort().join(','),
        profile.country || '',
        preferences.location || '',
        preferences.remoteOnly ? 'remote' : 'all'
    ];
    // Simple hash or just join
    return `job_search:${parts.join('|').toLowerCase().replace(/\s+/g, '_')}`;
}

/**
 * Get cached job results
 * @param {string} key - Cache key
 * @returns {Promise<Object|null>} - Cached results or null
 */
export async function getCachedJobs(key) {
    if (!redis) return null;
    try {
        const data = await redis.get(key);
        return data ? data : null;
    } catch (error) {
        warn('Redis cache get error:', error);
        return null;
    }
}

/**
 * Cache job results
 * @param {string} key - Cache key
 * @param {Object} data - Job results to cache
 * @param {number} ttl - Time to live in seconds (default CACHE_TTL)
 */
export async function cacheJobs(key, data, ttl = CACHE_TTL) {
    if (!redis) return;
    try {
        // Guard against exceeding Upstash max request size (1MB free, 10MB paid)
        const payload = JSON.stringify(data);
        if (payload.length > 900_000) {
            warn(`Redis cache skip: payload too large (${(payload.length / 1024 / 1024).toFixed(1)}MB) for key: ${key}`);
            return;
        }
        await redis.set(key, data, { ex: ttl });
    } catch (error) {
        warn('Redis cache set error:', error);
    }
}
