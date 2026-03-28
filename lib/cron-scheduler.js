/**
 * Local cron scheduler — replaces Vercel's cron jobs when running in Docker/VPS.
 * Only activates when ENABLE_LOCAL_CRON=true.
 *
 * Schedules:
 *   - 6:00 AM UTC daily → /api/cron/scan-jobs (scan ATS for new jobs)
 *   - 7:00 AM UTC daily → /api/cron/send-alerts (send job alert emails)
 */

export async function startCronScheduler() {
    if (process.env.ENABLE_LOCAL_CRON !== 'true') {
        console.log('[Cron] ENABLE_LOCAL_CRON not set — skipping local cron scheduler');
        return;
    }

    const cron = await import('node-cron');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.warn('[Cron] CRON_SECRET not set — cron jobs will fail auth');
    }

    const headers = {
        'Authorization': `Bearer ${cronSecret}`,
    };

    // Scan ATS for new jobs — 6:00 AM UTC daily
    cron.default.schedule('0 6 * * *', async () => {
        console.log('[Cron] Running scan-jobs...');
        try {
            const res = await fetch(`${baseUrl}/api/cron/scan-jobs`, { headers });
            const data = await res.json();
            console.log('[Cron] scan-jobs result:', data);
        } catch (e) {
            console.error('[Cron] scan-jobs failed:', e.message);
        }
    }, { timezone: 'UTC' });

    // Send job alert emails — 7:00 AM UTC daily
    cron.default.schedule('0 7 * * *', async () => {
        console.log('[Cron] Running send-alerts...');
        try {
            const res = await fetch(`${baseUrl}/api/cron/send-alerts`, { headers });
            const data = await res.json();
            console.log('[Cron] send-alerts result:', data);
        } catch (e) {
            console.error('[Cron] send-alerts failed:', e.message);
        }
    }, { timezone: 'UTC' });

    console.log('[Cron] Local cron scheduler started (scan-jobs @ 6AM UTC, send-alerts @ 7AM UTC)');
}
