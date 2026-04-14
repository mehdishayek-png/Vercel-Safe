import { ApifyClient } from 'apify-client';

/**
 * Fetch jobs from Dice.com and Naukri using Apify actors.
 *
 * Actors used (matching user's Apify console):
 *   - shahidirfan/Dice-Job-Scraper   → $1.00 / 1,000 results (US tech jobs)
 *   - memo23/naukri-scraper           → $0.99 / 1,000 results (India jobs)
 *
 * Indeed coverage is handled for free via JSearch API (fetchIndeedViaJobsAPI),
 * so we don't burn Apify credits on it.
 */
export async function fetchApifyAggregators(queries, location) {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
        console.log('[APIFY_AGG] SKIPPED: No APIFY_API_TOKEN');
        return [];
    }
    if (!queries || queries.length === 0) return [];

    const client = new ApifyClient({ token });
    const allJobs = [];

    const locationStr = location || '';
    const query = typeof queries[0] === 'string' ? queries[0] : (queries[0].q || queries[0]);
    if (!query) return [];

    console.log(`[APIFY_AGG] Firing aggregators for "${query}" in "${locationStr}"`);

    const tasks = [
        // ---- Dice.com (US tech jobs, fast, no proxy needed) ----
        client.actor('shahidirfan/Dice-Job-Scraper').call({
            search: query,
            location: locationStr,
            maxItems: 20,
        }, { waitSecs: 60 }).then(async run => {
            const { items } = await client.dataset(run.defaultDatasetId).listItems();
            console.log(`[APIFY_AGG] Dice: ${items.length} jobs`);
            return items.map(item => ({
                id: item.id || item.jobId || item.url || String(Math.random()),
                title: item.title || item.jobTitle || '',
                company: item.company || item.companyName || '',
                location: item.location || '',
                date_posted: item.postedDate || item.date || new Date().toISOString(),
                apply_url: item.url || item.jobUrl || item.applyUrl || '',
                source: 'Dice (Apify)',
                summary: item.description || item.jobDescription || '',
                _enriched: !!(item.description && item.description.length > 100),
            }));
        }).catch(e => { console.error('[APIFY_AGG] Dice failed:', e.message); return []; }),

        // ---- Naukri (India jobs) ----
        client.actor('memo23/naukri-scraper').call({
            keyword: query,
            location: locationStr,
            maxItems: 20,
        }, { waitSecs: 60 }).then(async run => {
            const { items } = await client.dataset(run.defaultDatasetId).listItems();
            console.log(`[APIFY_AGG] Naukri: ${items.length} jobs`);
            return items.map(item => ({
                id: item.jobId || String(Math.random()),
                title: item.title || '',
                company: item.companyName || item.company || '',
                location: item.location || '',
                date_posted: item.date || new Date().toISOString(),
                apply_url: item.jobUrl || item.url || '',
                source: 'Naukri (Apify)',
                summary: item.jobDescription || item.description || '',
                _enriched: !!(item.jobDescription && item.jobDescription.length > 100),
            }));
        }).catch(e => { console.error('[APIFY_AGG] Naukri failed:', e.message); return []; }),
    ];

    try {
        const results = await Promise.all(tasks);

        for (const resultSet of results) {
            for (const job of resultSet) {
                if (job && job.title) allJobs.push(job);
            }
        }

        console.log(`[APIFY_AGG] Total: ${allJobs.length} aggregated jobs`);
        return allJobs;
    } catch (err) {
        console.error('[APIFY_AGG] Catastrophic failure:', err.message);
        return [];
    }
}
