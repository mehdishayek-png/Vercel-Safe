import { ApifyClient } from 'apify-client';

/**
 * Fetch jobs from Indeed, Naukri, and Foundit utilizing Apify actors
 */
export async function fetchApifyAggregators(queries, location) {
    if (!queries || queries.length === 0) return [];
    
    // Default to an empty array so we can pool results
    const allJobs = [];

    const client = new ApifyClient({
        token: process.env.APIFY_API_TOKEN,
    });

    const locationStr = location || 'India';
    // Use the first query as the primary seed for aggregators
    const query = typeof queries[0] === 'string' ? queries[0] : (queries[0].q || queries[0]);
    if (!query) return [];

    try {
        // Run all three aggregators in parallel to save time within the 300s Vercel envelope
        console.log(`[APIFY_AGG] Firing asynchronous aggregators for "${query}" in "${locationStr}"`);
        
        const tasks = [
            // Indeed Scraper 
            client.actor("shahidirfan/indeed-job-scraper").call({
                "searchTerms": query,
                "location": locationStr,
                "maxItems": 20
            }).then(async run => {
                const { items } = await client.dataset(run.defaultDatasetId).listItems();
                return items.map(item => ({
                    id: item.id || String(Math.random()),
                    title: item.jobTitle || item.title,
                    company: item.companyName || item.company,
                    location: item.location,
                    date_posted: item.postedAt || new Date().toISOString(),
                    apply_url: item.url || item.jobUrl || '',
                    source: 'Indeed (Apify)',
                    summary: item.description || '',
                    _enriched: true
                }));
            }).catch(e => { console.error('Indeed failed', e); return []; }),

            // Naukri Scraper
            client.actor("memo23/naukri-scraper").call({
                "keyword": query,
                "location": locationStr,
                "maxItems": 20
            }).then(async run => {
                const { items } = await client.dataset(run.defaultDatasetId).listItems();
                return items.map(item => ({
                    id: item.jobId || String(Math.random()),
                    title: item.title,
                    company: item.companyName,
                    location: item.location,
                    date_posted: item.date || new Date().toISOString(),
                    apply_url: item.jobUrl || '',
                    source: 'Naukri (Apify)',
                    summary: item.jobDescription || item.description || '',
                    _enriched: true
                }));
            }).catch(e => { console.error('Naukri failed', e); return []; }),

            // Foundit Scraper
            client.actor("easyapi/foundit-jobs-scraper").call({
                "search": query,
                "location": locationStr,
                "limit": 20
            }).then(async run => {
                const { items } = await client.dataset(run.defaultDatasetId).listItems();
                return items.map(item => ({
                    id: item.job_id || String(Math.random()),
                    title: item.title,
                    company: item.company,
                    location: item.location,
                    date_posted: item.updatedAt || new Date().toISOString(),
                    apply_url: item.url || '',
                    source: 'Foundit (Apify)',
                    summary: item.description || '',
                    _enriched: true
                }));
            }).catch(e => { console.error('Foundit failed', e); return []; })
        ];

        const results = await Promise.all(tasks);
        
        // Flatten the array of arrays
        for (const resultSet of results) {
            for (const job of resultSet) {
                if (job && job.title) allJobs.push(job);
            }
        }

        return allJobs;

    } catch (err) {
        console.error(`[APIFY_AGG] Catastrophic failure in aggregator pool:`, err);
        return [];
    }
}
