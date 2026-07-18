/**
 * FEEDBACK TRACKER — Records user interactions with scored jobs.
 *
 * Tracks: click, save, apply, dismiss, skip per (userId, jobKey).
 * Aggregates by user cluster (role family + seniority) for scoring calibration.
 *
 * Data flows:
 *   User action → trackInteraction() → Redis sorted set + hash
 *   Calibration → getClusterFeedback() → weight adjustment signals
 *
 * Redis keys:
 *   fb:{userId}:actions     — hash of jobKey → action type
 *   fb:cluster:{cluster}    — sorted set of { score, action } for calibration
 *   fb:stats                — global counters for monitoring
 */

import { redis } from './redis.js';

const VALID_ACTIONS = new Set(['click', 'save', 'apply', 'dismiss', 'skip']);
const ACTION_SIGNAL = { click: 0.3, save: 0.7, apply: 1.0, dismiss: -0.5, skip: -0.2 };
const MAX_USER_HISTORY = 500;    // max actions per user (LRU eviction)
const CLUSTER_TTL = 60 * 60 * 24 * 90; // 90-day TTL on cluster data

/**
 * Generate a stable key for a job (company + title hash).
 */
function jobKey(job) {
    const raw = `${(job.company || '').toLowerCase().trim()}::${(job.title || '').toLowerCase().trim()}`;
    // Simple hash — not crypto, just for dedup
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
    }
    return `j:${Math.abs(hash).toString(36)}`;
}

/**
 * Derive user cluster from profile for aggregation.
 * Format: "{roleFamily}:{seniority}" e.g., "engineering:senior"
 */
function userCluster(profile) {
    const title = (profile?.headline || '').toLowerCase();

    // Seniority detection
    let seniority = 'mid';
    if (/\b(intern|fresher|trainee|junior|entry)\b/.test(title)) seniority = 'junior';
    else if (/\b(senior|staff|principal|lead)\b/.test(title)) seniority = 'senior';
    else if (/\b(director|head|vp|chief|c-level)\b/.test(title)) seniority = 'executive';

    // Role family detection (simplified)
    const FAMILIES = {
        engineering: /\b(engineer|developer|programmer|architect|swe|sde|devops|sre|software|fullstack|frontend|backend)\b/,
        data: /\b(data|analyst|machine learning|ml |ai |analytics)\b/,
        design: /\b(designer|ux |ui |product design|graphic)\b/,
        product: /\b(product manager|product owner|program manager)\b/,
        marketing: /\b(marketing|growth|seo|content|brand)\b/,
        sales: /\b(sales|account executive|business development|bdr|sdr)\b/,
        cx_support: /\b(customer|cx |csm|support|success)\b/,
        finance: /\b(finance|accountant|auditor|controller)\b/,
        hr: /\b(human resources|hr |recruiter|talent)\b/,
        operations: /\b(operations|ops |supply chain|logistics)\b/,
    };

    let family = 'other';
    for (const [f, regex] of Object.entries(FAMILIES)) {
        if (regex.test(title)) { family = f; break; }
    }

    return `${family}:${seniority}`;
}

/**
 * Track a user interaction with a scored job.
 *
 * @param {string} userId - Clerk user ID
 * @param {object} job - The job object (needs title + company)
 * @param {string} action - 'click' | 'save' | 'apply' | 'dismiss' | 'skip'
 * @param {number} pandaScore - The score this job received
 * @param {object} profile - User profile (for cluster derivation)
 */
export async function trackInteraction(userId, job, action, pandaScore, profile) {
    if (!redis || !userId || !job || !VALID_ACTIONS.has(action)) return;

    const jk = jobKey(job);
    const cluster = userCluster(profile);
    const signal = ACTION_SIGNAL[action];
    const now = Date.now();

    try {
        const pipe = redis.pipeline();

        // 1. Store user-level action
        pipe.hset(`fb:${userId}:actions`, { [jk]: JSON.stringify({
            action,
            score: pandaScore,
            t: now,
            company: String(job.company || '').slice(0, 200),
            title: String(job.title || '').slice(0, 250),
            source: String(job.source || '').slice(0, 120),
            runId: job._telemetry?.runId || null,
        }) });

        // 2. Store cluster-level signal for calibration
        // Score = pandaScore, member = `{signal}:{timestamp}` for uniqueness
        pipe.zadd(`fb:cluster:${cluster}`, {
            score: pandaScore,
            member: `${signal}:${pandaScore}:${now}`,
        });
        pipe.expire(`fb:cluster:${cluster}`, CLUSTER_TTL);

        // 3. Increment global counters
        pipe.hincrby('fb:stats', action, 1);
        pipe.hincrby('fb:stats', 'total', 1);

        await pipe.exec();
    } catch (err) {
        // Feedback tracking is non-critical — fail silently
        console.error('[FEEDBACK] Track error:', err.message);
    }
}

/**
 * Get aggregated feedback for a user cluster.
 * Returns signal distribution by score range for weight calibration.
 *
 * @param {string} cluster - e.g., "engineering:senior"
 * @returns {{
 *   positiveAvgScore: number,
 *   negativeAvgScore: number,
 *   totalActions: number,
 *   applyRate: number,
 *   scoreDistribution: { bucket: string, positive: number, negative: number }[]
 * }}
 */
export async function getClusterFeedback(cluster) {
    if (!redis) return null;

    try {
        const entries = await redis.zrange(`fb:cluster:${cluster}`, 0, -1, { withScores: true });
        if (!entries || entries.length === 0) return null;

        let positiveSum = 0, positiveCount = 0;
        let negativeSum = 0, negativeCount = 0;
        let applyCount = 0;
        const buckets = { '0-20': { pos: 0, neg: 0 }, '21-40': { pos: 0, neg: 0 }, '41-60': { pos: 0, neg: 0 }, '61-80': { pos: 0, neg: 0 }, '81-100': { pos: 0, neg: 0 } };

        for (let i = 0; i < entries.length; i += 2) {
            const member = entries[i];
            const score = parseFloat(entries[i + 1]);
            const signal = parseFloat(member.split(':')[0]);

            const bucket = score <= 20 ? '0-20' : score <= 40 ? '21-40' : score <= 60 ? '41-60' : score <= 80 ? '61-80' : '81-100';

            if (signal > 0) {
                positiveSum += score;
                positiveCount++;
                buckets[bucket].pos++;
                if (signal >= 1.0) applyCount++;
            } else {
                negativeSum += score;
                negativeCount++;
                buckets[bucket].neg++;
            }
        }

        const total = positiveCount + negativeCount;
        return {
            positiveAvgScore: positiveCount > 0 ? Math.round(positiveSum / positiveCount) : 0,
            negativeAvgScore: negativeCount > 0 ? Math.round(negativeSum / negativeCount) : 0,
            totalActions: total,
            applyRate: total > 0 ? parseFloat((applyCount / total).toFixed(3)) : 0,
            scoreDistribution: Object.entries(buckets).map(([bucket, { pos, neg }]) => ({
                bucket, positive: pos, negative: neg,
            })),
        };
    } catch (err) {
        console.error('[FEEDBACK] Cluster fetch error:', err.message);
        return null;
    }
}

/**
 * Get a user's recent action history (for dedup / preference learning).
 */
export async function getUserActions(userId, limit = 50) {
    if (!redis || !userId) return [];

    try {
        const raw = await redis.hgetall(`fb:${userId}:actions`);
        if (!raw) return [];

        return Object.entries(raw)
            .map(([key, val]) => {
                const parsed = typeof val === 'string' ? JSON.parse(val) : val;
                return { jobKey: key, ...parsed };
            })
            .sort((a, b) => (b.t || 0) - (a.t || 0))
            .slice(0, limit);
    } catch (err) {
        console.error('[FEEDBACK] User actions fetch error:', err.message);
        return [];
    }
}

/**
 * Get global feedback stats (for admin dashboard).
 */
export async function getFeedbackStats() {
    if (!redis) return null;
    try {
        return await redis.hgetall('fb:stats');
    } catch (err) {
        return null;
    }
}

export { jobKey, userCluster };
