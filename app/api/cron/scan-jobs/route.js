import { NextResponse } from 'next/server';
import { fetchATSJobs } from '@/lib/ats-fetcher';
import { getUniqueQueries, addJobsToPool } from '@/lib/job-alerts';

export const maxDuration = 60;

export async function GET(request) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const queries = await getUniqueQueries();
        if (queries.length === 0) {
            return NextResponse.json({ message: 'No queries to scan', jobsAdded: 0 });
        }

        console.log(`[cron/scan-jobs] Scanning ATS for ${queries.length} unique queries`);

        // Batch queries in groups of 10 to avoid overwhelming ATS APIs
        let totalAdded = 0;
        const batchSize = 10;

        for (let i = 0; i < queries.length; i += batchSize) {
            const batch = queries.slice(i, i + batchSize);

            // fetchATSJobs accepts an array of queries
            const jobs = await fetchATSJobs(batch, '', {});

            if (jobs.length > 0) {
                const added = await addJobsToPool(jobs);
                totalAdded += added;
            }
        }

        console.log(`[cron/scan-jobs] Done — ${totalAdded} new jobs added to pool`);
        return NextResponse.json({
            success: true,
            queriesScanned: queries.length,
            jobsAdded: totalAdded
        });
    } catch (err) {
        console.error('[cron/scan-jobs] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
