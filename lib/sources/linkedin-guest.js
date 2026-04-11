/**
 * LinkedIn Guest Jobs API — public, no-auth, returns HTML fragments
 *
 * Endpoint: https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search
 * Method: GET
 * Returns: HTML <li> fragments (10 per page)
 * Pagination: ?start=0, 10, 20... (verified working to 200+)
 *
 * Cost: FREE
 * Rate limit: ~1 req/sec safe; bursts may trigger throttling
 *
 * Verified working: April 2026
 */

const BASE_URL = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';

// LinkedIn geoId map for major cities (LinkedIn-specific IDs, NOT Google Ads IDs)
// Format: city → geoId. Use country geoId as fallback.
// IMPORTANT: For India, prefer "Greater X Area" metro IDs (90009xxx) over city-only
// IDs — metros pull suburb postings (Whitefield, Electronic City, etc.) the city ID misses.
const LINKEDIN_GEO_IDS = {
    // India — metro IDs preferred
    'india': 102713980,
    'bengaluru': 90009633, 'bangalore': 90009633,             // Greater Bengaluru Area (metro)
    'mumbai': 90009639, 'bombay': 90009639,                    // Mumbai Metropolitan
    'hyderabad': 90009650,                                      // Greater Hyderabad Area (metro)
    'delhi': 106187582, 'new delhi': 115918471,
    'chennai': 106888327, 'madras': 106888327,
    'pune': 114806696,
    'gurgaon': 115884833, 'gurugram': 115884833,
    'noida': 104869687,
    'kolkata': 111795395, 'calcutta': 111795395,
    'ahmedabad': 104990346,
    // US
    'united states': 103644278, 'usa': 103644278, 'us': 103644278,
    'new york': 105080838, 'nyc': 105080838,
    'san francisco': 102277331,
    'seattle': 104116203,
    'boston': 102380872,
    'austin': 104472865,
    'los angeles': 102448103,
    'chicago': 103112676,
    // UK
    'united kingdom': 101165590, 'uk': 101165590, 'gb': 101165590,
    'london': 102257491,
    // Other major
    'singapore': 102454443,
    'dubai': 104305776, 'uae': 104305776,
    'toronto': 100025096,
    'berlin': 106967730,
    'amsterdam': 102890719,
    'paris': 104469799,
    'tokyo': 103145359,
};

// Time-posted-range filter values (LinkedIn f_TPR parameter)
const TPR_VALUES = {
    '24h': 'r86400',
    'week': 'r604800',
    'month': 'r2592000',
};

// Work type filter values (LinkedIn f_WT parameter)
const WORK_TYPE = {
    'onsite': '1',
    'remote': '2',
    'hybrid': '3',
};

/**
 * Resolve a location string to a LinkedIn geoId.
 */
function resolveGeoId(location, userCountry) {
    if (location) {
        const cityCandidate = location.split(',')[0].trim().toLowerCase();
        if (LINKEDIN_GEO_IDS[cityCandidate]) return LINKEDIN_GEO_IDS[cityCandidate];

        // Try all segments
        for (const seg of location.split(',').map(s => s.trim().toLowerCase())) {
            if (LINKEDIN_GEO_IDS[seg]) return LINKEDIN_GEO_IDS[seg];
        }
    }
    if (userCountry) {
        const code = LINKEDIN_GEO_IDS[userCountry.toLowerCase()];
        if (code) return code;
    }
    return LINKEDIN_GEO_IDS['india']; // default
}

/**
 * Parse a single LinkedIn job card HTML into a structured job object.
 */
function parseJobCard(cardHtml) {
    const titleM = cardHtml.match(/<h3[^>]*base-search-card__title[^>]*>\s*([\s\S]*?)\s*<\/h3>/);
    const companyM = cardHtml.match(/<h4[^>]*base-search-card__subtitle[^>]*>\s*<a[^>]*>\s*([\s\S]*?)\s*<\/a>/);
    const locationM = cardHtml.match(/<span[^>]*job-search-card__location[^>]*>\s*([\s\S]*?)\s*<\/span>/);
    const dateM = cardHtml.match(/<time[^>]*datetime="([^"]+)"/);
    const urlM = cardHtml.match(/href="(https:\/\/[^"]*linkedin\.com\/jobs\/view\/[^"]*)"/);
    const urnM = cardHtml.match(/urn:li:jobPosting:(\d+)/);

    if (!titleM || !companyM) return null;

    // Strip HTML entities and extra whitespace
    const cleanText = (s) => (s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

    return {
        id: urnM ? urnM[1] : '',
        title: cleanText(titleM[1]),
        company: cleanText(companyM[1]),
        location: cleanText(locationM ? locationM[1] : ''),
        date_posted: dateM ? dateM[1] : '',
        apply_url: urlM ? urlM[1].split('?')[0] : '',
        source: 'LinkedIn (Guest)',
        summary: '', // LinkedIn guest endpoint doesn't return descriptions in search results
    };
}

/**
 * Fetch one page (25 jobs) of LinkedIn guest results.
 * Page size is fixed at 25 by LinkedIn.
 */
async function fetchPage(query, geoId, location, start) {
    const params = new URLSearchParams({
        keywords: query,
        location: location || '',
        geoId: String(geoId),
        start: String(start),
        f_TPR: TPR_VALUES['24h'], // last 24 hours only (drastically reduces high-applicant jobs)
    });

    try {
        const res = await fetch(`${BASE_URL}?${params}`, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) return [];
        const html = await res.text();

        // Split into individual job cards (each is a <li>...</li>)
        const cards = html.split(/<li[\s>]/).slice(1).map(c => '<li ' + c);
        return cards.map(parseJobCard).filter(Boolean);
    } catch {
        return [];
    }
}

/**
 * Main fetch function — query LinkedIn guest API for multiple search terms.
 *
 * @param {string[]} queries - Search query strings
 * @param {string} location - User location string (e.g., "Bengaluru, India")
 * @param {object} preferences - User preferences (for country fallback)
 * @returns {Promise<object[]>} Array of job objects
 */
export async function fetchLinkedInGuest(queries, location, preferences = {}) {
    if (!queries || queries.length === 0) {
        return [];
    }

    const userCountry = preferences.country || '';
    const geoId = resolveGeoId(location, userCountry);
    const locationStr = location || 'India';

    const allJobs = [];
    const seen = new Set();

    // LinkedIn page size is 25. 3 queries x 2 pages = up to 150 jobs per scan.
    // Sequential with jitter delay to avoid 429s from Vercel egress IPs.
    const queryLimit = Math.min(queries.length, 3);
    const pagesPerQuery = 2; // start=0, start=25 → 50 jobs per query

    for (let i = 0; i < queryLimit; i++) {
        const query = typeof queries[i] === 'string' ? queries[i] : (queries[i].q || queries[i]);
        if (!query) continue;

        for (let page = 0; page < pagesPerQuery; page++) {
            const jobs = await fetchPage(query, geoId, locationStr, page * 25);

            for (const job of jobs) {
                const dedupKey = `${job.company.toLowerCase()}::${job.title.toLowerCase()}`;
                if (seen.has(dedupKey) || !job.title) continue;
                seen.add(dedupKey);
                allJobs.push(job);
            }

            if (jobs.length < 25) break; // No more pages
        }

        // Polite delay between queries to reduce 429 risk on shared Vercel IPs
        if (i < queryLimit - 1) await new Promise(r => setTimeout(r, 1500));
    }

    return allJobs;
}

// Export internals for testing
export { resolveGeoId, parseJobCard, LINKEDIN_GEO_IDS };
