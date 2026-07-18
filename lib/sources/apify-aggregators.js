import { ApifyClient } from 'apify-client';
import { normalizeActorLocation, runActorWithinBudget } from './apify-runner.js';

/**
 * Fetch jobs from Dice.com and Naukri using Apify actors.
 *
 * Actors used (matching user's Apify console):
 *   - shahidirfan/Dice-Job-Scraper   → $1.00 / 1,000 results (US tech jobs)
 *   - memo23/naukri-scraper           → $0.99 / 1,000 results (India + Gulf jobs)
 *
 * Indeed coverage is handled for free via JSearch API (fetchIndeedViaJobsAPI).
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

    const locationStr = normalizeActorLocation(location);
    const naukriLocationStr = normalizeActorLocation(location, { cityOnly: true });
    const query = typeof queries[0] === 'string' ? queries[0] : (queries[0].q || queries[0]);
    if (!query) return [];

    console.log(`[APIFY_AGG] Firing aggregators for "${query}" in "${locationStr}"`);

    // Build Naukri search URL from query + location
    const naukriKeyword = encodeURIComponent(query.replace(/\s+/g, '-').toLowerCase());
    const naukriSearchTerm = encodeURIComponent(query);
    const naukriLocation = naukriLocationStr ? `&l=${encodeURIComponent(naukriLocationStr)}` : '';
    const naukriUrl = `https://www.naukri.com/${naukriKeyword}-jobs?k=${naukriSearchTerm}${naukriLocation}`;

    const tasks = [
        // ---- Dice.com (US tech jobs, fast, no proxy needed) ----
        // Input schema: keyword, location, posted_date, results_wanted, maxPages
        runActorWithinBudget(client, 'shahidirfan/Dice-Job-Scraper', {
            keyword: query,
            location: locationStr || 'Remote',
            posted_date: '24h',
            results_wanted: 20,
            maxPages: 1,
        }, { waitSecs: 40, runTimeoutSecs: 46, maxItems: 20, maxTotalChargeUsd: 0.04 }).then(result => {
            console.log(`[APIFY_AGG] Dice: ${result.items.length} jobs (${result.status})`);
            return result.items.map(item => ({
                id: item.jobId || item.guid || item.id || String(Math.random()),
                title: item.title || '',
                company: item.company || item.companyName || '',
                location: item.location || '',
                date_posted: item.posted || item.updated || new Date().toISOString(),
                apply_url: item.url || item.detailsPageUrl || '',
                source: 'Dice (Apify)',
                salary: item.salary || '',
                summary: item.description_text || item.description_html || item.summary || '',
                _enriched: !!(item.description_text && item.description_text.length > 100),
            }));
        }).catch(e => { console.error('[APIFY_AGG] Dice failed:', e.message); return []; }),

        // ---- Naukri + Naukrigulf (India + Gulf jobs) ----
        // Input schema: startUrls (array of search URLs), maxItems
        runActorWithinBudget(client, 'memo23/naukri-scraper', {
            startUrls: [naukriUrl],
            maxItems: 20,
            maxConcurrency: 5,
        }, { waitSecs: 40, runTimeoutSecs: 46, maxItems: 20, maxTotalChargeUsd: 0.04 }).then(result => {
            console.log(`[APIFY_AGG] Naukri: ${result.items.length} jobs (${result.status})`);
            return result.items.map(item => {
                // Handle both Naukri.com and Naukrigulf.com output schemas
                const isGulf = item.source === 'naukrigulf';
                const title = isGulf ? (item.Designation || '') : (item.title || '');
                const company = isGulf
                    ? (item.Company?.Name || '')
                    : (item.companyDetail?.name || item.staticCompanyName || '');
                const loc = isGulf
                    ? (item.Location || '')
                    : (item.locations?.[0]?.label || '');
                const desc = isGulf
                    ? (item.Description || '')
                    : (item.description || item.shortDescription || '');
                const url = isGulf
                    ? (item.JdURL || '')
                    : (item.staticUrl ? `https://www.naukri.com${item.staticUrl.startsWith('/') ? '' : '/'}${item.staticUrl}` : '');
                const posted = isGulf
                    ? (item.Other?.PostedDate ? new Date(item.Other.PostedDate * 1000).toISOString() : new Date().toISOString())
                    : (item.createdDate || new Date().toISOString());

                return {
                    id: item.jobId || item.JobId || String(Math.random()),
                    title,
                    company,
                    location: loc,
                    date_posted: posted,
                    apply_url: url,
                    source: isGulf ? 'Naukrigulf (Apify)' : 'Naukri (Apify)',
                    summary: desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
                    _enriched: !!(desc && desc.length > 100),
                };
            });
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
