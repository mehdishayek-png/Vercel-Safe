import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { isDbEnabled, query } from '@/lib/db';
import { validateOrigin } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

const SearchHistorySchema = z.object({
    profile: z.object({
        headline: z.string().max(200).optional().default(''),
        skills: z.array(z.string().max(100)).max(50).optional().default([]),
        experience_years: z.number().min(0).max(100).optional().default(0),
        location: z.string().max(200).optional().default(''),
    }).passthrough(),
    preferences: z.record(z.string(), z.unknown()).optional().default({}),
    jobs: z.array(z.record(z.string(), z.unknown())).max(150),
    summary: z.object({
        runId: z.string().uuid().nullable().optional(),
        sources: z.record(z.string(), z.number()).optional().default({}),
        totalFetched: z.number().int().min(0).optional().default(0),
        durationMs: z.number().int().min(0).max(600_000).optional().default(0),
    }).optional().default({}),
});

function slimJob(job) {
    const summary = String(job.summary || job.description || '').slice(0, 4000);
    return {
        ...job,
        summary,
        description: undefined,
        resume_text: undefined,
    };
}

export async function GET(request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isDbEnabled()) return NextResponse.json({ runs: [], source: 'local' });

    const requested = Number(new URL(request.url).searchParams.get('limit') || 1);
    const limit = Math.max(1, Math.min(10, Number.isFinite(requested) ? requested : 1));

    try {
        const runs = await query(
            `SELECT id, profile_context, preferences, sources, total_fetched,
                    total_displayed, duration_ms, created_at
             FROM search_runs WHERE user_id = $1
             ORDER BY created_at DESC LIMIT $2`,
            [userId, limit], { throwOnError: true },
        );

        if (runs.length === 0) return NextResponse.json({ runs: [], jobs: [], source: 'server' });

        const jobs = await query(
            `SELECT job FROM search_results WHERE run_id = $1 ORDER BY rank ASC`,
            [runs[0].id], { throwOnError: true },
        );

        return NextResponse.json({ runs, jobs: jobs.map(row => row.job), source: 'server' });
    } catch (error) {
        console.error('[search-history] load failed:', error);
        return NextResponse.json({ runs: [], jobs: [], source: 'local' });
    }
}

export async function POST(request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!validateOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    if (!isDbEnabled()) return NextResponse.json({ persisted: false, source: 'local' });

    const parsed = SearchHistorySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid search history payload' }, { status: 400 });
    }

    const { profile, preferences, jobs, summary } = parsed.data;
    const runId = summary.runId || crypto.randomUUID();
    const profileContext = {
        headline: profile.headline,
        skills: profile.skills.slice(0, 30),
        experience_years: profile.experience_years,
        location: profile.location,
    };
    const rows = jobs.map((job, index) => ({
        job_key: String(job.apply_url || job.id || `${job.company || ''}::${job.title || ''}`).slice(0, 1000),
        job: slimJob(job),
        score: Number(job.analysis?.fit_score || job.match_score || 0),
        rank: index + 1,
    }));

    try {
        await query('INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [userId], { throwOnError: true });
        const persistedRun = await query(
            `INSERT INTO search_runs
                (id, user_id, profile_context, preferences, sources, total_fetched, total_displayed, duration_ms)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET
                profile_context = EXCLUDED.profile_context,
                preferences = EXCLUDED.preferences,
                sources = EXCLUDED.sources,
                total_fetched = EXCLUDED.total_fetched,
                total_displayed = EXCLUDED.total_displayed,
                duration_ms = EXCLUDED.duration_ms
             WHERE search_runs.user_id = EXCLUDED.user_id
             RETURNING id`,
            [runId, userId, profileContext, preferences, summary.sources, summary.totalFetched, rows.length, summary.durationMs],
            { throwOnError: true },
        );
        if (persistedRun.length === 0) {
            return NextResponse.json({ error: 'Search run does not belong to this account' }, { status: 403 });
        }
        if (rows.length > 0) {
            await query(
                `INSERT INTO search_results (run_id, job_key, job, score, rank)
                 SELECT $1, item.job_key, item.job, item.score, item.rank
                 FROM jsonb_to_recordset($2::jsonb)
                    AS item(job_key text, job jsonb, score real, rank integer)
                 ON CONFLICT (run_id, job_key) DO NOTHING`,
                [runId, JSON.stringify(rows)], { throwOnError: true },
            );
        }
        return NextResponse.json({ persisted: true, runId });
    } catch (error) {
        console.error('[search-history] save failed:', error);
        return NextResponse.json({ error: 'Failed to persist search history' }, { status: 500 });
    }
}
