import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/tokens';
import { isDbEnabled, query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function authorize() {
    const { userId } = await auth();
    return userId && await isAdmin(userId);
}

function hoursFrom(request) {
    const value = Number(new URL(request.url).searchParams.get('hours') || 24);
    return Math.max(1, Math.min(24 * 30, Number.isFinite(value) ? Math.round(value) : 24));
}

export async function GET(request) {
    if (!(await authorize())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!isDbEnabled()) return NextResponse.json({ error: 'Telemetry database unavailable' }, { status: 503 });

    const url = new URL(request.url);
    const runId = url.searchParams.get('runId');

    try {
        if (runId) {
            const [runs, sources, candidates, outcomes] = await Promise.all([
                query(
                    `SELECT id, profile_context, preferences, status, queries, role_family,
                            anti_families, sources, total_raw, total_unique, total_scored,
                            total_displayed, total_discarded, duration_ms, engine_version,
                            created_at, completed_at
                     FROM search_runs WHERE id = $1 LIMIT 1`,
                    [runId], { throwOnError: true },
                ),
                query(
                    `SELECT source_name, source_type, status, cache_hit, latency_ms,
                            raw_count, unique_count, duplicate_count, enriched_count,
                            scored_count, displayed_count, discarded_count, zero_count, error_code
                     FROM search_source_metrics WHERE run_id = $1
                     ORDER BY displayed_count DESC, unique_count DESC`,
                    [runId], { throwOnError: true },
                ),
                query(
                    `SELECT job_key, source_name, title, company, location, apply_url,
                            score, final_score, decision, display_threshold, killer,
                            description_chars, multipliers, boosts, metadata
                     FROM search_candidates WHERE run_id = $1
                     ORDER BY decision = 'displayed' DESC, COALESCE(final_score, score) DESC
                     LIMIT 2500`,
                    [runId], { throwOnError: true },
                ),
                query(
                    `SELECT job_key, action, score, rank, source_name, metadata, created_at
                     FROM search_outcomes WHERE run_id = $1 ORDER BY created_at ASC`,
                    [runId], { throwOnError: true },
                ),
            ]);
            if (runs.length === 0) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
            return NextResponse.json({ run: runs[0], sources, candidates, outcomes });
        }

        const hours = hoursFrom(request);
        const interval = `${hours} hours`;
        const [overview, sources, killers, reviewQueue, falsePositives, calibration] = await Promise.all([
            query(
                `SELECT count(*)::int AS runs,
                        count(*) FILTER (WHERE status = 'completed')::int AS completed_runs,
                        count(*) FILTER (WHERE status = 'failed')::int AS failed_runs,
                        round(avg(duration_ms))::int AS avg_duration_ms,
                        sum(total_raw)::int AS raw_jobs,
                        sum(total_unique)::int AS unique_jobs,
                        sum(total_scored)::int AS scored_jobs,
                        sum(total_displayed)::int AS displayed_jobs,
                        sum(total_discarded)::int AS discarded_jobs
                 FROM search_runs WHERE created_at >= now() - $1::interval`,
                [interval], { throwOnError: true },
            ),
            query(
                `WITH metric AS (
                    SELECT source_name,
                           count(*)::int AS runs,
                           count(*) FILTER (WHERE status IN ('success', 'partial', 'empty'))::int AS successful_runs,
                           round(avg(latency_ms))::int AS avg_latency_ms,
                           round(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms))::int AS p95_latency_ms,
                           sum(raw_count)::int AS raw_jobs,
                           sum(unique_count)::int AS unique_jobs,
                           sum(enriched_count)::int AS enriched_jobs,
                           sum(displayed_count)::int AS displayed_jobs,
                           sum(discarded_count)::int AS discarded_jobs
                    FROM search_source_metrics
                    WHERE created_at >= now() - $1::interval
                    GROUP BY source_name
                 ), outcome AS (
                    SELECT source_name,
                           count(*) FILTER (WHERE action = 'click')::int AS clicks,
                           count(*) FILTER (WHERE action = 'save')::int AS saves,
                           count(*) FILTER (WHERE action = 'apply')::int AS applications,
                           count(*) FILTER (WHERE action = 'dismiss')::int AS dismissals
                    FROM search_outcomes
                    WHERE created_at >= now() - $1::interval
                    GROUP BY source_name
                 )
                 SELECT metric.*,
                        round(100.0 * successful_runs / NULLIF(runs, 0), 1) AS success_rate,
                        round(100.0 * displayed_jobs / NULLIF(unique_jobs, 0), 1) AS display_yield,
                        COALESCE(clicks, 0) AS clicks, COALESCE(saves, 0) AS saves,
                        COALESCE(applications, 0) AS applications,
                        COALESCE(dismissals, 0) AS dismissals
                 FROM metric LEFT JOIN outcome USING (source_name)
                 ORDER BY applications DESC, saves DESC, displayed_jobs DESC`,
                [interval], { throwOnError: true },
            ),
            query(
                `SELECT killer, count(*)::int AS jobs, round(avg(score)::numeric, 1) AS avg_score
                 FROM search_candidates
                 WHERE created_at >= now() - $1::interval AND decision = 'discarded'
                 GROUP BY killer ORDER BY jobs DESC LIMIT 25`,
                [interval], { throwOnError: true },
            ),
            query(
                `SELECT run_id, job_key, source_name, title, company, location, score,
                        final_score, display_threshold, killer, multipliers, boosts, apply_url
                 FROM search_candidates
                 WHERE created_at >= now() - $1::interval AND decision = 'discarded'
                 ORDER BY score DESC LIMIT 100`,
                [interval], { throwOnError: true },
            ),
            query(
                `SELECT candidate.run_id, candidate.job_key, candidate.source_name,
                        candidate.title, candidate.company, candidate.score,
                        outcome.action, outcome.created_at
                 FROM search_outcomes outcome
                 JOIN search_candidates candidate
                   ON candidate.run_id = outcome.run_id AND candidate.job_key = outcome.job_key
                 WHERE outcome.created_at >= now() - $1::interval
                   AND candidate.decision = 'displayed' AND outcome.action = 'dismiss'
                 ORDER BY candidate.score DESC LIMIT 100`,
                [interval], { throwOnError: true },
            ),
            query(
                `WITH buckets AS (
                    SELECT run_id, job_key,
                           CASE WHEN score < 20 THEN '00-19'
                                WHEN score < 40 THEN '20-39'
                                WHEN score < 60 THEN '40-59'
                                WHEN score < 80 THEN '60-79'
                                ELSE '80-100' END AS score_bucket
                    FROM search_candidates
                    WHERE created_at >= now() - $1::interval AND decision = 'displayed'
                 )
                 SELECT score_bucket, count(DISTINCT (buckets.run_id, buckets.job_key))::int AS displayed,
                        count(*) FILTER (WHERE outcome.action = 'click')::int AS clicks,
                        count(*) FILTER (WHERE outcome.action = 'save')::int AS saves,
                        count(*) FILTER (WHERE outcome.action = 'apply')::int AS applications,
                        count(*) FILTER (WHERE outcome.action = 'dismiss')::int AS dismissals
                 FROM buckets
                 LEFT JOIN search_outcomes outcome
                   ON outcome.run_id = buckets.run_id AND outcome.job_key = buckets.job_key
                 GROUP BY score_bucket ORDER BY score_bucket`,
                [interval], { throwOnError: true },
            ),
        ]);

        return NextResponse.json({
            windowHours: hours,
            overview: overview[0] || {},
            sources,
            killers,
            reviewQueue,
            falsePositives,
            calibration,
        });
    } catch (error) {
        console.error('[admin/search-telemetry]', error);
        return NextResponse.json({ error: 'Failed to load search telemetry' }, { status: 500 });
    }
}
