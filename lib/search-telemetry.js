import { createHash, randomUUID } from 'node:crypto';
import { isDbEnabled, query } from './db.js';

const ENGINE_VERSION = (
    process.env.RAILWAY_GIT_COMMIT_SHA
    || process.env.VERCEL_GIT_COMMIT_SHA
    || process.env.GIT_COMMIT_SHA
    || 'development'
).slice(0, 40);
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
let lastRetentionSweep = 0;

function text(value, max = 500) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalized(value) {
    return text(value, 1000).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function telemetryJobKey(job) {
    const identity = [job?.company, job?.title, job?.location].map(normalized).join('::');
    const fallback = text(job?.apply_url || job?.id || identity, 2000);
    return createHash('sha256').update(identity.replace(/:/g, '') ? identity : fallback).digest('hex');
}

export function explainScoreDecision(pandaScore, displayThreshold) {
    const score = number(pandaScore?.score);
    if (score <= 0) return { decision: 'zero', killer: 'zero_score' };
    if (score >= displayThreshold) return { decision: 'displayed', killer: null };

    const multipliers = pandaScore?.multipliers || {};
    const killers = [];
    if (number(multipliers.location, 1) < 0.1) killers.push(`location=${multipliers.location}`);
    if (number(multipliers.roleFamily, 1) < 0.5) killers.push(`role=${multipliers.roleFamily}`);
    if (number(multipliers.domain, 1) < 0.5) killers.push(`domain=${multipliers.domain}`);
    if (number(multipliers.seniority, 1) < 0.3) killers.push(`seniority=${multipliers.seniority}`);
    if (number(multipliers.recency, 1) < 0.5) killers.push(`recency=${multipliers.recency}`);
    if (number(multipliers.coherence, 1) < 0.5) killers.push(`coherence=${multipliers.coherence}`);
    return { decision: 'discarded', killer: killers.join(',') || 'low_raw' };
}

export function buildCandidateObservation({ runId, sourceName, job, pandaScore, displayThreshold }) {
    const { decision, killer } = explainScoreDecision(pandaScore, displayThreshold);
    const matches = Array.isArray(pandaScore?.matches) ? pandaScore.matches : [];
    const boosts = matches.slice(0, 5).map((match) => ({
        skill: text(match?.skill || match?.keyword || match, 100),
        value: number(match?.value, 0),
    }));

    return {
        run_id: runId,
        job_key: telemetryJobKey(job),
        source_name: text(job?.source || sourceName || 'Unknown', 150),
        title: text(job?.title, 300),
        company: text(job?.company, 300),
        location: text(job?.location, 300),
        apply_url: text(job?.apply_url, 2000) || null,
        score: number(pandaScore?.score),
        final_score: null,
        decision,
        display_threshold: displayThreshold,
        killer,
        description_chars: text(job?.summary || job?.description, 10000).length,
        multipliers: pandaScore?.multipliers || {},
        boosts,
        metadata: {
            datePosted: text(job?.date_posted, 100) || null,
            enriched: job?._enriched === true,
        },
    };
}

function profileContext(profile, locationResolution) {
    return {
        headline: text(profile?.headline, 200),
        skills: (profile?.skills || []).slice(0, 30).map((skill) => text(skill, 100)),
        experience_years: number(profile?.experience_years),
        location: text(locationResolution?.raw || profile?.location, 200),
        location_resolution: locationResolution || null,
    };
}

function preferenceContext(preferences) {
    return {
        location: text(preferences?.location, 200),
        city: text(preferences?.city, 100),
        state: text(preferences?.state, 100),
        country: text(preferences?.country, 50),
        remoteOnly: preferences?.remoteOnly === true,
        forceRefresh: preferences?.forceRefresh === true,
        midasSearch: preferences?.midasSearch === true,
    };
}

async function sweepExpiredTelemetry() {
    const now = Date.now();
    if (now - lastRetentionSweep < 24 * 60 * 60 * 1000) return;
    lastRetentionSweep = now;
    const cutoff = new Date(now - RETENTION_MS).toISOString();
    try {
        await query('DELETE FROM search_runs WHERE created_at < $1', [cutoff], { throwOnError: true });
        await query('DELETE FROM search_outcomes WHERE created_at < $1', [cutoff], { throwOnError: true });
    } catch (error) {
        console.warn('[telemetry] retention sweep failed:', error.message);
    }
}

export async function startSearchTelemetry({ runId, userId, profile, preferences, locationResolution }) {
    if (!isDbEnabled() || !runId || !userId) return false;
    try {
        await query('INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [userId], { throwOnError: true });
        await query(
            `INSERT INTO search_runs
                (id, user_id, profile_context, preferences, status, engine_version)
             VALUES ($1, $2, $3, $4, 'running', $5)
             ON CONFLICT (id) DO NOTHING`,
            [runId, userId, profileContext(profile, locationResolution), preferenceContext(preferences), ENGINE_VERSION],
            { throwOnError: true },
        );
        await sweepExpiredTelemetry();
        return true;
    } catch (error) {
        console.warn('[telemetry] start failed:', error.message);
        return false;
    }
}

export async function completeSearchTelemetry({
    runId,
    userId,
    profile,
    preferences,
    locationResolution,
    queries = [],
    roleFamily,
    antiFamilies = [],
    sourceMetrics = {},
    candidates = [],
    totals = {},
    durationMs = 0,
}) {
    if (!isDbEnabled() || !runId || !userId) return false;

    const sourceRows = Object.entries(sourceMetrics).map(([sourceName, metric]) => ({
        source_name: text(sourceName, 150),
        source_type: text(metric.sourceType || 'unknown', 50),
        status: text(metric.status || 'success', 50),
        cache_hit: metric.cacheHit === true,
        latency_ms: Math.max(0, Math.round(number(metric.latencyMs))),
        raw_count: Math.max(0, Math.round(number(metric.rawCount ?? metric.fetched))),
        unique_count: Math.max(0, Math.round(number(metric.uniqueCount ?? metric.fetched))),
        duplicate_count: Math.max(0, Math.round(number(metric.duplicateCount))),
        enriched_count: Math.max(0, Math.round(number(metric.enriched))),
        scored_count: Math.max(0, Math.round(number(metric.scored))),
        displayed_count: Math.max(0, Math.round(number(metric.displayed))),
        discarded_count: Math.max(0, Math.round(number(metric.discarded))),
        zero_count: Math.max(0, Math.round(number(metric.zero))),
        error_code: text(metric.errorCode, 120) || null,
        metadata: metric.metadata || {},
    }));
    const candidateRows = candidates.slice(0, 2500);

    try {
        await startSearchTelemetry({ runId, userId, profile, preferences, locationResolution });
        await Promise.all([
            query(
                `UPDATE search_runs SET
                    profile_context = $3, preferences = $4, status = 'completed', sources = $5,
                    queries = $6, role_family = $7, anti_families = $8,
                    total_fetched = $9, total_displayed = $10, duration_ms = $11,
                    total_raw = $12, total_unique = $13, total_scored = $14,
                    total_discarded = $15, engine_version = $16, completed_at = now()
                 WHERE id = $1 AND user_id = $2`,
                [
                    runId, userId, profileContext(profile, locationResolution), preferenceContext(preferences),
                    totals.sources || {}, queries, roleFamily || null, antiFamilies,
                    number(totals.fetched), number(totals.displayed), number(durationMs),
                    number(totals.raw), number(totals.unique), number(totals.scored),
                    number(totals.discarded), ENGINE_VERSION,
                ],
                { throwOnError: true },
            ),
            sourceRows.length > 0 ? query(
                `INSERT INTO search_source_metrics
                    (run_id, source_name, source_type, status, cache_hit, latency_ms,
                     raw_count, unique_count, duplicate_count, enriched_count, scored_count,
                     displayed_count, discarded_count, zero_count, error_code, metadata)
                 SELECT $1, item.source_name, item.source_type, item.status, item.cache_hit,
                        item.latency_ms, item.raw_count, item.unique_count, item.duplicate_count,
                        item.enriched_count, item.scored_count, item.displayed_count,
                        item.discarded_count, item.zero_count, item.error_code, item.metadata
                 FROM jsonb_to_recordset($2::jsonb) AS item(
                    source_name text, source_type text, status text, cache_hit boolean,
                    latency_ms integer, raw_count integer, unique_count integer,
                    duplicate_count integer, enriched_count integer, scored_count integer,
                    displayed_count integer, discarded_count integer, zero_count integer,
                    error_code text, metadata jsonb)
                 ON CONFLICT (run_id, source_name) DO UPDATE SET
                    status = EXCLUDED.status, cache_hit = EXCLUDED.cache_hit,
                    latency_ms = EXCLUDED.latency_ms, raw_count = EXCLUDED.raw_count,
                    unique_count = EXCLUDED.unique_count, duplicate_count = EXCLUDED.duplicate_count,
                    enriched_count = EXCLUDED.enriched_count, scored_count = EXCLUDED.scored_count,
                    displayed_count = EXCLUDED.displayed_count,
                    discarded_count = EXCLUDED.discarded_count, zero_count = EXCLUDED.zero_count,
                    error_code = EXCLUDED.error_code, metadata = EXCLUDED.metadata`,
                [runId, JSON.stringify(sourceRows)],
                { throwOnError: true },
            ) : Promise.resolve([]),
            candidateRows.length > 0 ? query(
                `INSERT INTO search_candidates
                    (run_id, job_key, source_name, title, company, location, apply_url,
                     score, final_score, decision, display_threshold, killer,
                     description_chars, multipliers, boosts, metadata)
                 SELECT item.run_id, item.job_key, item.source_name, item.title, item.company,
                        item.location, item.apply_url, item.score, item.final_score,
                        item.decision, item.display_threshold, item.killer,
                        item.description_chars, item.multipliers, item.boosts, item.metadata
                 FROM jsonb_to_recordset($1::jsonb) AS item(
                    run_id text, job_key text, source_name text, title text, company text,
                    location text, apply_url text, score real, final_score real, decision text,
                    display_threshold real, killer text, description_chars integer,
                    multipliers jsonb, boosts jsonb, metadata jsonb)
                 ON CONFLICT (run_id, job_key) DO UPDATE SET
                    final_score = EXCLUDED.final_score, decision = EXCLUDED.decision,
                    killer = EXCLUDED.killer, multipliers = EXCLUDED.multipliers,
                    boosts = EXCLUDED.boosts, metadata = EXCLUDED.metadata`,
                [JSON.stringify(candidateRows)],
                { throwOnError: true },
            ) : Promise.resolve([]),
        ]);
        return true;
    } catch (error) {
        console.warn('[telemetry] completion failed:', error.message);
        return false;
    }
}

export async function failSearchTelemetry(runId, userId, error, durationMs = 0) {
    if (!isDbEnabled() || !runId || !userId) return false;
    try {
        await query(
            `UPDATE search_runs SET status = 'failed', duration_ms = $3,
                    completed_at = now(), sources = jsonb_build_object('error', $4::text)
             WHERE id = $1 AND user_id = $2`,
            [runId, userId, Math.max(0, Math.round(number(durationMs))), text(error?.name || 'search_error', 80)],
            { throwOnError: true },
        );
        return true;
    } catch {
        return false;
    }
}

export async function recordSearchOutcome({ eventId, userId, runId, job, action, score, rank, metadata }) {
    if (!isDbEnabled() || !userId || !job || !action) return false;
    const jobKey = text(job?._telemetry?.jobKey, 64) || telemetryJobKey(job);
    const linkedRunId = text(runId || job?._telemetry?.runId, 100) || null;
    try {
        await query('INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [userId], { throwOnError: true });
        await query(
            `INSERT INTO search_outcomes
                (event_id, user_id, run_id, job_key, action, score, rank, source_name, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (event_id) DO NOTHING`,
            [
                text(eventId, 100) || randomUUID(), userId, linkedRunId, jobKey,
                text(action, 50), number(score), Number.isInteger(rank) ? rank : null,
                text(job?.source, 150) || null,
                { title: text(job?.title, 300), company: text(job?.company, 300), ...(metadata || {}) },
            ],
            { throwOnError: true },
        );
        return true;
    } catch (error) {
        console.warn('[telemetry] outcome failed:', error.message);
        return false;
    }
}

export { ENGINE_VERSION };
