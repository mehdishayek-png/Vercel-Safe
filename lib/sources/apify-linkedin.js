import { ApifyClient } from 'apify-client';

/**
 * Fetch LinkedIn jobs using practicaltools/linkedin-jobs (SnNEWiOAQe9V9bEzL)
 * Pay-per-result: $0.001/job + $0.001/description = $0.002 per enriched job
 * No login required — uses LinkedIn's public guest API.
 *
 * Runs alongside linkedin-guest.js to supplement with full descriptions
 * that the Panda Matching Engine needs for deep scoring.
 */
export async function fetchApifyLinkedIn(queries, location, preferences = {}) {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
        console.log('[APIFY_LI] SKIPPED: No APIFY_API_TOKEN');
        return [];
    }
    if (!queries || queries.length === 0) return [];

    const client = new ApifyClient({ token });
    const locationStr = location || '';
    const allJobs = [];

    // Budget guard: only use first 2 queries, 2 pages each (≈40 jobs max → ~$0.08)
    const querySlice = queries.slice(0, 2);

    try {
        for (const rawQ of querySlice) {
            const keywords = typeof rawQ === 'string' ? rawQ : (rawQ.q || rawQ);
            if (!keywords) continue;

            const input = {
                keywords,
                location: locationStr,
                maxPages: 2,               // 20 jobs per run (10/page)
                fetchDescription: true,     // $0.001 extra per job — worth it for Panda
                timePosted: 'r86400',       // Last 24 hours only
                sortBy: 'DD',              // Most recent first
            };

            console.log(`[APIFY_LI] Scraping "${keywords}" in "${locationStr}" (2 pages, descriptions ON)`);

            const run = await client.actor('practicaltools/linkedin-jobs').call(input, {
                waitSecs: 60,  // Hard cap — fail fast if actor hangs
            });

            const { items } = await client.dataset(run.defaultDatasetId).listItems();
            console.log(`[APIFY_LI] Got ${items.length} jobs for "${keywords}"`);

            for (const item of items) {
                if (!item.title) continue;

                allJobs.push({
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
                });
            }
        }

        console.log(`[APIFY_LI] Total: ${allJobs.length} enriched LinkedIn jobs`);
        return allJobs;
    } catch (err) {
        console.error(`[APIFY_LI] Error:`, err.message || err);
        return []; // Graceful fallback — linkedin-guest.js still covers LinkedIn
    }
}
