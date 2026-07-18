import { ApifyClient } from 'apify-client';
import { normalizeActorLocation, runActorWithinBudget } from './apify-runner.js';

/**
 * Fetch LinkedIn jobs using practicaltools/linkedin-jobs (SnNEWiOAQe9V9bEzL)
 * Pay-per-result: $0.001/job + $0.001/description = $0.002 per enriched job
 * No login required — uses LinkedIn's public guest API.
 *
 * Runs alongside linkedin-guest.js to supplement with full descriptions
 * that the Panda Matching Engine needs for deep scoring.
 */
export async function fetchApifyLinkedIn(queries, location, preferences = {}) {
    const token = process.env.APIFY_API_TOKEN || process.env.APIFY_API_KEY;
    if (!token) {
        console.log('[APIFY_LI] SKIPPED: No APIFY_API_TOKEN');
        return [];
    }
    if (!queries || queries.length === 0) return [];

    const client = new ApifyClient({ token });
    const locationStr = normalizeActorLocation(location);

    // Budget guard: at most two parallel queries and 20 charged items per run.
    const querySlice = queries.slice(0, 2);

    try {
        const runs = await Promise.allSettled(querySlice.map(async (rawQ) => {
            const keywords = typeof rawQ === 'string' ? rawQ : (rawQ.q || rawQ);
            if (!keywords) return [];

            const input = {
                keywords,
                location: locationStr,
                maxPages: 1,
                fetchDescription: true,     // $0.001 extra per job — worth it for Panda
                timePosted: 'r86400',       // Last 24 hours only
                sortBy: 'DD',              // Most recent first
            };

            console.log(`[APIFY_LI] Scraping "${keywords}" in "${locationStr}" (descriptions ON)`);

            const result = await runActorWithinBudget(client, 'practicaltools/linkedin-jobs', input, {
                waitSecs: 42,
                runTimeoutSecs: 48,
                maxItems: 20,
                maxTotalChargeUsd: 0.05,
            });
            console.log(`[APIFY_LI] Got ${result.items.length} jobs for "${keywords}" (${result.status}${result.partial ? ', partial retained' : ''})`);
            return result.items.filter(item => item.title).map(item => ({
                    id: item.jobId || item.url || String(Math.random()),
                    title: item.title,
                    company: item.company || '',
                    location: item.location || '',
                    date_posted: item.datePosted || new Date().toISOString(),
                    apply_url: item.url || '',
                    source: 'LinkedIn (Apify)',
                    logo: item.logo || '',
                    labels: item.labels || [],
                    // Full description from fetchDescription: true
                    summary: item.description || '',
                    _enriched: !!(item.description && item.description.length > 100),
                    _actor_partial: result.partial,
                }));
        }));

        const allJobs = runs.flatMap(result => result.status === 'fulfilled' ? result.value : []);

        console.log(`[APIFY_LI] Total: ${allJobs.length} enriched LinkedIn jobs`);
        return allJobs;
    } catch (err) {
        console.error(`[APIFY_LI] Error:`, err.message || err);
        return []; // Graceful fallback — linkedin-guest.js still covers LinkedIn
    }
}
