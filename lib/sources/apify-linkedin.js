import { ApifyClient } from 'apify-client';

/**
 * Fetch LinkedIn jobs using the Apify Actor: worldunboxer/rapid-linkedin-scraper
 * This returns full job descriptions, skipping the need for `jd-enricher.js`
 */
export async function fetchApifyLinkedIn(queries, location, preferences = {}) {
    if (!queries || queries.length === 0) return [];
    
    const client = new ApifyClient({
        token: process.env.APIFY_API_TOKEN,
    });

    const locationStr = location || 'India';
    const allJobs = [];
    const maxJobsPerQuery = 20; // Keep this tight to ensure the 300s timeout isn't breached

    try {
        for (let i = 0; i < queries.length; i++) {
            const query = typeof queries[i] === 'string' ? queries[i] : (queries[i].q || queries[i]);
            if (!query) continue;

            const input = {
                "keyword": query,
                "location": locationStr,
                "limit": maxJobsPerQuery,
                "timeFilters": "24h", 
            };

            console.log(`[APIFY_LINKEDIN] Triggering synchronous scrape: "${query}" in "${locationStr}"`);
            
            // Run the actor synchronously
            const run = await client.actor("worldunboxer/rapid-linkedin-scraper").call(input);
            console.log(`[APIFY_LINKEDIN] Run finished. Dataset ID: ${run.defaultDatasetId}`);

            // Fetch the dataset items
            const { items } = await client.dataset(run.defaultDatasetId).listItems();

            for (const item of items) {
                // Map the Apify output to Midas Match `job` struct
                if (!item.title || !item.company) continue;

                allJobs.push({
                    id: item.id || item.jobId || String(Math.random()),
                    title: item.title,
                    company: item.company || item.companyName,
                    location: item.location,
                    date_posted: item.postedDate || item.date || new Date().toISOString(),
                    apply_url: item.url || item.jobUrl || '',
                    source: 'LinkedIn (Apify)',
                    // Crucially, this provides the FULL text which satisfies the Panda engine completely
                    summary: item.description || item.jobDescription || '', 
                    _enriched: true // Flag to skip jd-enricher
                });
            }
        }
        return allJobs;
    } catch (err) {
        console.error(`[APIFY_LINKEDIN] Error running actor:`, err);
        return []; // Fallback gracefully if actor fails
    }
}
