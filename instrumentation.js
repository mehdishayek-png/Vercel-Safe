/**
 * Next.js instrumentation hook — runs once on server startup.
 * Used to start the local cron scheduler in Docker/VPS mode.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { startCronScheduler } = await import('./lib/cron-scheduler.js');
        await startCronScheduler();
    }
}
