import { redis } from './redis.js';
import { warn } from './logger.js';

const CACHE_TTL = 3600; // 1 hour in seconds

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
/**
 * Flush all job cache keys (ats_*, serp_*, job_search:*, linkedin_*, adzuna_*)
 */
export async function flushJobCache() {
    if (!redis) return { flushed: 0 };
    try {
        let cursor = '0';
        let totalDeleted = 0;
        do {
            const [nextCursor, keys] = await redis.scan(cursor, { match: '*', count: 100 });
            cursor = nextCursor;
            const jobKeys = keys.filter(k =>
                k.startsWith('ats_') || k.startsWith('serp_') || k.startsWith('job_search:') ||
                k.startsWith('linkedin_') || k.startsWith('adzuna_') || k.startsWith('jsearch_') ||
                k.startsWith('himalayas_') || k.startsWith('jobicy_') || k.startsWith('findwork_')
            );
            if (jobKeys.length > 0) {
                await redis.del(...jobKeys);
                totalDeleted += jobKeys.length;
            }
        } while (cursor !== '0');
        return { flushed: totalDeleted };
    } catch (error) {
        warn('Redis flush error:', error);
        return { flushed: 0, error: error.message };
    }
}

/**
 * Slim down job objects for caching by stripping large fields.
 * Keeps only essential fields to stay under Redis payload limits.
 */
const KEEP_FIELDS = new Set([
    'title', 'company', 'location', 'apply_url', 'source', 'date_posted',
    'match_score', 'skills', 'keywords', 'id', 'is_direct', 'salary', 'work_arrangement', 'summary'
]);

export function slimJobsForCache(jobs) {
    if (!Array.isArray(jobs)) return jobs;
    return jobs.map(job => {
        const slim = {};
        for (const key of KEEP_FIELDS) {
            if (job[key] !== undefined) {
                const val = job[key];
                const maxLength = key === 'summary' ? 1500 : 500;
                // Truncate large string fields
                if (typeof val === 'string' && val.length > maxLength) {
                    slim[key] = val.slice(0, maxLength);
                } else {
                    slim[key] = val;
                }
            }
        }
        return slim;
    });
}

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
