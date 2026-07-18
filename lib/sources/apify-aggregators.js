import { ApifyClient } from 'apify-client';
import { normalizeActorLocation, runActorWithinBudget } from './apify-runner.js';

function actorContext(queries) {
    const token = process.env.APIFY_API_TOKEN || process.env.APIFY_API_KEY;
    const query = typeof queries?.[0] === 'string' ? queries[0] : (queries?.[0]?.q || queries?.[0]);
    if (!token || !query) return null;
    return { client: new ApifyClient({ token }), query };
}

export async function fetchApifyDice(queries, location) {
    const context = actorContext(queries);
    if (!context) {
        console.log('[APIFY_DICE] SKIPPED: missing token or query');
        return [];
    }

    const locationStr = normalizeActorLocation(location) || 'Remote';
    try {
        const result = await runActorWithinBudget(context.client, 'shahidirfan/Dice-Job-Scraper', {
            keyword: context.query,
            location: locationStr,
            posted_date: '24h',
            results_wanted: 20,
            maxPages: 1,
        }, { waitSecs: 40, runTimeoutSecs: 46, maxItems: 20, maxTotalChargeUsd: 0.04 });

        console.log(`[APIFY_DICE] ${result.items.length} jobs (${result.status})`);
        return result.items.filter((item) => item.title).map((item) => ({
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
            _actor_partial: result.partial,
        }));
    } catch (error) {
        console.error('[APIFY_DICE] Failed:', error.message);
        return [];
    }
}

export async function fetchApifyNaukri(queries, location) {
    const context = actorContext(queries);
    if (!context) {
        console.log('[APIFY_NAUKRI] SKIPPED: missing token or query');
        return [];
    }

    const city = normalizeActorLocation(location, { cityOnly: true });
    const keywordSlug = encodeURIComponent(context.query.replace(/\s+/g, '-').toLowerCase());
    const searchTerm = encodeURIComponent(context.query);
    const locationParam = city ? `&l=${encodeURIComponent(city)}` : '';
    const startUrl = `https://www.naukri.com/${keywordSlug}-jobs?k=${searchTerm}${locationParam}`;

    try {
        const result = await runActorWithinBudget(context.client, 'memo23/naukri-scraper', {
            startUrls: [startUrl],
            maxItems: 20,
            maxConcurrency: 5,
        }, { waitSecs: 40, runTimeoutSecs: 46, maxItems: 20, maxTotalChargeUsd: 0.04 });

        console.log(`[APIFY_NAUKRI] ${result.items.length} jobs (${result.status})`);
        return result.items.map((item) => {
            const isGulf = item.source === 'naukrigulf';
            const title = isGulf ? (item.Designation || '') : (item.title || '');
            const company = isGulf
                ? (item.Company?.Name || '')
                : (item.companyDetail?.name || item.staticCompanyName || '');
            const itemLocation = isGulf
                ? (item.Location || '')
                : (item.locations?.[0]?.label || '');
            const description = isGulf
                ? (item.Description || '')
                : (item.description || item.shortDescription || '');
            const applyUrl = isGulf
                ? (item.JdURL || '')
                : (item.staticUrl ? `https://www.naukri.com${item.staticUrl.startsWith('/') ? '' : '/'}${item.staticUrl}` : '');
            const posted = isGulf
                ? (item.Other?.PostedDate ? new Date(item.Other.PostedDate * 1000).toISOString() : new Date().toISOString())
                : (item.createdDate || new Date().toISOString());

            return {
                id: item.jobId || item.JobId || String(Math.random()),
                title,
                company,
                location: itemLocation,
                date_posted: posted,
                apply_url: applyUrl,
                source: isGulf ? 'Naukrigulf (Apify)' : 'Naukri (Apify)',
                summary: description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
                _enriched: description.length > 100,
                _actor_partial: result.partial,
            };
        }).filter((job) => job.title);
    } catch (error) {
        console.error('[APIFY_NAUKRI] Failed:', error.message);
        return [];
    }
}

// Backward-compatible combined entry point for callers outside the registry.
export async function fetchApifyAggregators(queries, location) {
    const [dice, naukri] = await Promise.all([
        fetchApifyDice(queries, location),
        fetchApifyNaukri(queries, location),
    ]);
    return [...dice, ...naukri];
}
