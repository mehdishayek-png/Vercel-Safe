import { Redis } from '@upstash/redis';
import { log, warn } from './logger.js';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

// TTLs
const ALERT_PROFILE_TTL = 60 * 60 * 24 * 30; // 30 days
const JOB_POOL_TTL = 60 * 60 * 24 * 7;       // 7 days
const SEEN_JOBS_TTL = 60 * 60 * 24 * 14;      // 14 days

// ─── Keys ──────────────────────────────────────────────────────────────────

function alertProfileKey(userId) {
    return `alerts:profile:${userId}`;
}

function alertProfilesIndexKey() {
    return 'alerts:profiles:index'; // SET of all userIds with alert profiles
}

function jobPoolKey() {
    return 'alerts:job_pool';
}

function uniqueQueriesKey() {
    return 'alerts:unique_queries';
}

function seenJobsKey(userId) {
    return `alerts:seen:${userId}`;
}

// ─── Save alert profile ────────────────────────────────────────────────────

/**
 * Save a user's search profile for daily alerts.
 * Called after each user-initiated scan.
 *
 * @param {string} userId
 * @param {Object} profile - { headline, skills, experience_years, location, name }
 * @param {Object} preferences - { country, state, city, remoteOnly }
 */
export async function saveAlertProfile(userId, profile, preferences) {
    if (!redis || !userId) return;
    try {
        const alertProfile = {
            userId,
            headline: profile.headline || '',
            skills: (profile.skills || []).slice(0, 20),
            experience_years: profile.experience_years || 0,
            location: profile.location || '',
            name: profile.name || '',
            country: preferences?.country || '',
            state: preferences?.state || '',
            city: preferences?.city || '',
            remoteOnly: preferences?.remoteOnly || false,
            updatedAt: Date.now(),
        };

        await redis.set(alertProfileKey(userId), alertProfile, { ex: ALERT_PROFILE_TTL });
        await redis.sadd(alertProfilesIndexKey(), userId);

        // Also add their job title as a unique query
        if (alertProfile.headline) {
            await redis.sadd(uniqueQueriesKey(), alertProfile.headline.toLowerCase().trim());
        }
        // Add top skills as queries too
        for (const skill of alertProfile.skills.slice(0, 5)) {
            const combined = `${alertProfile.headline || ''} ${skill}`.trim();
            if (combined.length > 3) {
                await redis.sadd(uniqueQueriesKey(), combined.toLowerCase());
            }
        }

        log(`[alerts] Saved alert profile for user ${userId}: "${alertProfile.headline}"`);
    } catch (err) {
        warn(`[alerts] Failed to save alert profile: ${err.message}`);
    }
}

// ─── Get all alert profiles ────────────────────────────────────────────────

/**
 * Get all user IDs that have active alert profiles.
 * @returns {Promise<string[]>}
 */
export async function getAllAlertUserIds() {
    if (!redis) return [];
    try {
        const ids = await redis.smembers(alertProfilesIndexKey());
        return ids || [];
    } catch (err) {
        warn(`[alerts] Failed to get alert user IDs: ${err.message}`);
        return [];
    }
}

/**
 * Get a specific user's alert profile.
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
export async function getAlertProfile(userId) {
    if (!redis) return null;
    try {
        return await redis.get(alertProfileKey(userId));
    } catch {
        return null;
    }
}

// ─── Get all unique queries ────────────────────────────────────────────────

/**
 * Get all unique search queries to scan for.
 * @returns {Promise<string[]>}
 */
export async function getUniqueQueries() {
    if (!redis) return [];
    try {
        const queries = await redis.smembers(uniqueQueriesKey());
        return queries || [];
    } catch {
        return [];
    }
}

// ─── Job pool management ───────────────────────────────────────────────────

/**
 * Add jobs to the shared pool. Deduplicates by apply_url.
 * @param {Object[]} jobs - Array of job objects
 * @returns {Promise<number>} - Number of new jobs added
 */
export async function addJobsToPool(jobs) {
    if (!redis || !jobs.length) return 0;
    try {
        // Get existing pool
        const existing = (await redis.get(jobPoolKey())) || [];
        const existingUrls = new Set(existing.map(j => j.apply_url));

        // Filter to only new jobs
        const newJobs = jobs.filter(j => j.apply_url && !existingUrls.has(j.apply_url));
        if (newJobs.length === 0) return 0;

        // Add timestamp to new jobs
        const timestamped = newJobs.map(j => ({ ...j, pooledAt: Date.now() }));

        // Merge and cap at 2000 most recent
        const merged = [...timestamped, ...existing].slice(0, 2000);
        await redis.set(jobPoolKey(), merged, { ex: JOB_POOL_TTL });

        log(`[alerts] Added ${newJobs.length} new jobs to pool (total: ${merged.length})`);
        return newJobs.length;
    } catch (err) {
        warn(`[alerts] Failed to add jobs to pool: ${err.message}`);
        return 0;
    }
}

/**
 * Get all jobs from the shared pool.
 * @returns {Promise<Object[]>}
 */
export async function getJobPool() {
    if (!redis) return [];
    try {
        return (await redis.get(jobPoolKey())) || [];
    } catch {
        return [];
    }
}

// ─── Seen jobs tracking ────────────────────────────────────────────────────

/**
 * Get set of job URLs a user has already been alerted about.
 * @param {string} userId
 * @returns {Promise<Set<string>>}
 */
export async function getSeenJobs(userId) {
    if (!redis) return new Set();
    try {
        const seen = (await redis.get(seenJobsKey(userId))) || [];
        return new Set(seen);
    } catch {
        return new Set();
    }
}

/**
 * Mark jobs as seen for a user.
 * @param {string} userId
 * @param {string[]} jobUrls
 */
export async function markJobsSeen(userId, jobUrls) {
    if (!redis || !jobUrls.length) return;
    try {
        const existing = (await redis.get(seenJobsKey(userId))) || [];
        const merged = [...new Set([...jobUrls, ...existing])].slice(0, 5000);
        await redis.set(seenJobsKey(userId), merged, { ex: SEEN_JOBS_TTL });
    } catch (err) {
        warn(`[alerts] Failed to mark jobs seen: ${err.message}`);
    }
}
