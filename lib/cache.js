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
 * Generate a cache key for SerpApi queries
 */
export function generateSerpCacheKey(query, location) {
    const q = (query || 'all').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const l = (location || 'global').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return `serpapi:${q}:${l}`;
}

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
        await redis.set(key, data, { ex: ttl });
    } catch (error) {
        warn('Redis cache set error:', error);
    }
}
