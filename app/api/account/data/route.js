import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isDbEnabled, query } from '@/lib/db';
import { redis } from '@/lib/redis';
import { validateOrigin } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

function redisKeys(userId) {
    return [
        `alerts:profile:${userId}`,
        `alerts:seen:${userId}`,
        `fb:${userId}:actions`,
        `user:${userId}:tokens`,
        `user:${userId}:vest_schedule`,
        `ratelimit:${userId}`,
        `ratelimit:${userId}:recs`,
        `ratelimit:parse-resume:${userId}`,
        `ratelimit:career-insights:${userId}`,
        `ratelimit:salary-negotiation:${userId}`,
        `ratelimit:resume-gaps:${userId}`,
        `ratelimit:interview-prep:${userId}`,
        `ratelimit:analysis:${userId}`,
        `ratelimit:search-suggestions:${userId}`,
        `ratelimit:outreach:${userId}`,
        `ratelimit:tailor-cv:${userId}`,
        `ratelimit:cover-letter:${userId}`,
    ];
}

async function readRedisData(userId) {
    if (!redis) return { available: false };

    try {
        const [alertProfile, seenJobs, feedbackActions, tokenBalance, vestingSchedule] = await Promise.all([
            redis.get(`alerts:profile:${userId}`),
            redis.get(`alerts:seen:${userId}`),
            redis.hgetall(`fb:${userId}:actions`),
            redis.get(`user:${userId}:tokens`),
            redis.zrange(`user:${userId}:vest_schedule`, 0, -1, { withScores: true }),
        ]);
        return {
            available: true,
            alertProfile: alertProfile ?? null,
            alertedJobUrls: seenJobs ?? [],
            feedbackActions: feedbackActions ?? {},
            tokenBalance: tokenBalance ?? null,
            vestingSchedule: vestingSchedule ?? [],
        };
    } catch (error) {
        console.error('[account-data] Redis export failed:', error);
        return { available: false, error: 'User-scoped cache data could not be read.' };
    }
}

async function clearRedisData(userId) {
    if (!redis) return { available: false, cleared: false };

    try {
        const pipeline = redis.pipeline();
        for (const key of redisKeys(userId)) pipeline.del(key);
        pipeline.srem('alerts:profiles:index', userId);
        await pipeline.exec();
        return { available: true, cleared: true };
    } catch (error) {
        console.error('[account-data] Redis deletion failed:', error);
        return { available: true, cleared: false };
    }
}

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isDbEnabled()) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

    try {
        const account = await query(
            'SELECT id, email, created_at, updated_at FROM users WHERE id = $1',
            [userId], { throwOnError: true },
        );
        const [profiles, preferences, savedJobs, applications, searchRuns, searchResults,
            sourceMetrics, candidates, outcomes, tokens, cachedData] = await Promise.all([
            query(
                `SELECT data, role_emb::text AS role_embedding, role_emb_hash, updated_at
                 FROM profiles WHERE user_id = $1`,
                [userId], { throwOnError: true },
            ),
            query('SELECT data, updated_at FROM user_preferences WHERE user_id = $1', [userId], { throwOnError: true }),
            query('SELECT job_key, job, saved_at FROM saved_jobs WHERE user_id = $1 ORDER BY saved_at', [userId], { throwOnError: true }),
            query(
                'SELECT job_key, job, status, applied_at FROM applications WHERE user_id = $1 ORDER BY applied_at',
                [userId], { throwOnError: true },
            ),
            query('SELECT * FROM search_runs WHERE user_id = $1 ORDER BY created_at', [userId], { throwOnError: true }),
            query(
                `SELECT result.* FROM search_results result
                 JOIN search_runs run ON run.id = result.run_id
                 WHERE run.user_id = $1 ORDER BY run.created_at, result.rank`,
                [userId], { throwOnError: true },
            ),
            query(
                `SELECT metric.* FROM search_source_metrics metric
                 JOIN search_runs run ON run.id = metric.run_id
                 WHERE run.user_id = $1 ORDER BY metric.created_at`,
                [userId], { throwOnError: true },
            ),
            query(
                `SELECT candidate.* FROM search_candidates candidate
                 JOIN search_runs run ON run.id = candidate.run_id
                 WHERE run.user_id = $1 ORDER BY candidate.created_at`,
                [userId], { throwOnError: true },
            ),
            query('SELECT * FROM search_outcomes WHERE user_id = $1 ORDER BY created_at', [userId], { throwOnError: true }),
            query('SELECT balance, updated_at FROM user_tokens WHERE user_id = $1', [userId], { throwOnError: true }),
            readRedisData(userId),
        ]);

        const body = {
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            account: account[0] ?? null,
            profile: profiles[0] ?? null,
            preferences: preferences[0] ?? null,
            savedJobs,
            applications,
            searches: {
                runs: searchRuns,
                results: searchResults,
                sourceMetrics,
                candidates,
            },
            outcomes,
            entitlements: {
                database: tokens[0] ?? null,
                cache: cachedData,
            },
        };

        const date = new Date().toISOString().slice(0, 10);
        return NextResponse.json(body, {
            headers: {
                'Cache-Control': 'private, no-store, max-age=0',
                'Content-Disposition': `attachment; filename="midas-match-export-${date}.json"`,
            },
        });
    } catch (error) {
        console.error('[account-data] Export failed:', error);
        return NextResponse.json({ error: 'Failed to export account data.' }, { status: 500 });
    }
}

export async function DELETE(request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!validateOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    if (!isDbEnabled()) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

    try {
        await query('DELETE FROM users WHERE id = $1', [userId], { throwOnError: true });
        const cache = await clearRedisData(userId);
        return NextResponse.json({
            success: true,
            databaseCleared: true,
            cacheCleared: cache.cleared,
        });
    } catch (error) {
        console.error('[account-data] Deletion failed:', error);
        return NextResponse.json({ error: 'Failed to clear account data.' }, { status: 500 });
    }
}
