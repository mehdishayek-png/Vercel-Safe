import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { query, isDbEnabled } from '@/lib/db';
import { sendApplicationConfirmation } from '@/lib/email';
import { validateOrigin } from '@/lib/csrf';
import { recordSearchOutcome } from '@/lib/search-telemetry';
import { trackInteraction } from '@/lib/feedback-tracker';

// Saved/applied jobs are persisted in Postgres (saved_jobs / applications),
// replacing the previous ephemeral Redis storage. The request/response contract
// is unchanged so the frontend needs no changes.

const jobIdentity = (job) => job?.apply_url || `${job?.company || ''}::${job?.title || ''}`;

// GET — fetch saved jobs, or applied jobs when ?type=applied
export async function GET(request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isDbEnabled()) return NextResponse.json({ jobs: [], source: 'local' });

    const type = new URL(request.url).searchParams.get('type');

    try {
        const rows = type === 'applied'
            ? await query(
                'SELECT job, applied_at FROM applications WHERE user_id = $1 ORDER BY applied_at DESC LIMIT 200',
                [userId], { throwOnError: true })
            : await query(
                'SELECT job, saved_at FROM saved_jobs WHERE user_id = $1 ORDER BY saved_at DESC LIMIT 200',
                [userId], { throwOnError: true });

        // Re-hydrate the stored job objects (applied_at already lives inside job too).
        const jobs = rows.map((r) => r.job);
        return NextResponse.json({ jobs, source: 'server' });
    } catch (err) {
        console.error('Failed to fetch jobs:', err);
        return NextResponse.json({ jobs: [], source: 'local' });
    }
}

// POST — save/unsave or apply/unapply a job (toggle)
export async function POST(request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!validateOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    if (!isDbEnabled()) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

    try {
        const { job, action } = await request.json();
        const isAppliedAction = action === 'apply' || action === 'unapply';
        const table = isAppliedAction ? 'applications' : 'saved_jobs';
        const key = jobIdentity(job);

        // Ensure the user row exists (FK target for saved_jobs/applications).
        await query('INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [userId], { throwOnError: true });

        if (action === 'save') {
            await query(
                `INSERT INTO saved_jobs (user_id, job_key, job) VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, job_key) DO UPDATE SET job = EXCLUDED.job`,
                [userId, key, job], { throwOnError: true });
        } else if (action === 'apply') {
            const applied = { ...job, applied_at: new Date().toISOString() };
            await query(
                `INSERT INTO applications (user_id, job_key, job) VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, job_key) DO UPDATE SET job = EXCLUDED.job`,
                [userId, key, applied], { throwOnError: true });
        } else if (action === 'unsave') {
            await query('DELETE FROM saved_jobs WHERE user_id = $1 AND job_key = $2', [userId, key], { throwOnError: true });
        } else if (action === 'unapply') {
            await query('DELETE FROM applications WHERE user_id = $1 AND job_key = $2', [userId, key], { throwOnError: true });
        }

        const countRows = await query(`SELECT count(*)::int AS n FROM ${table} WHERE user_id = $1`, [userId]);
        const count = countRows[0]?.n ?? 0;

        // Fire-and-forget application confirmation email
        if (action === 'apply') {
            currentUser().then((user) => {
                const email = user?.emailAddresses?.[0]?.emailAddress;
                if (email) {
                    sendApplicationConfirmation(email, user?.firstName || 'there', job).catch(() => {});
                }
            }).catch(() => {});
        }

        const telemetryWrites = [];
        if (['save', 'unsave', 'apply', 'unapply'].includes(action)) {
            telemetryWrites.push(recordSearchOutcome({
                userId,
                job,
                action,
                score: job.analysis?.fit_score || job.match_score || job._localScore || 0,
            }));
        }
        if (action === 'save' || action === 'apply') {
            telemetryWrites.push(trackInteraction(
                userId,
                job,
                action,
                job.analysis?.fit_score || job.match_score || job._localScore || 0,
                {},
            ));
        }
        await Promise.all(telemetryWrites);

        return NextResponse.json({ success: true, count });
    } catch (err) {
        console.error('Failed to update job:', err);
        return NextResponse.json({ error: 'Failed to update job. Please try again.' }, { status: 500 });
    }
}
