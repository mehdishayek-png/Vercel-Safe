/**
 * Workday Public Job Search — public, no-auth, returns structured JSON
 *
 * Endpoint: https://{tenant}.{wdN}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
 * Method: POST
 * Body: { appliedFacets, limit, offset, searchText }
 * Returns: { total, jobPostings: [{ title, externalPath, locationsText, postedOn, bulletFields }] }
 *
 * Cost: FREE
 * Rate limit: per-tenant, ~5 req/sec is safe
 *
 * Verified working: April 2026
 */

// Curated list of Workday tenants — ALL VERIFIED LIVE with curl on April 7, 2026.
// Format: { host: 'subdomain.wdN.myworkdayjobs.com' OR 'wdN.myworkdaysite.com',
//           site: 'tenant/site-name',
//           name: 'Display Name' }
// Two host families exist:
// 1. {tenant}.{wdN}.myworkdayjobs.com (most common)
// 2. {wdN}.myworkdaysite.com/recruiting/{tenant}/{site} (Wells Fargo, AB InBev, etc.)
const WORKDAY_TENANTS = [
    // ── Tech (verified) ──────────────────────────────────────
    { host: 'salesforce.wd12.myworkdayjobs.com',     site: 'salesforce/External_Career_Site', name: 'Salesforce' },
    { host: 'nvidia.wd5.myworkdayjobs.com',          site: 'nvidia/NVIDIAExternalCareerSite', name: 'NVIDIA' },
    { host: 'adobe.wd5.myworkdayjobs.com',           site: 'adobe/external_experienced',      name: 'Adobe' },
    { host: 'intel.wd1.myworkdayjobs.com',           site: 'intel/External',                  name: 'Intel' },
    { host: 'dell.wd1.myworkdayjobs.com',            site: 'dell/External',                   name: 'Dell' },
    { host: 'hp.wd5.myworkdayjobs.com',              site: 'hp/ExternalCareerSite',           name: 'HP' },
    { host: 'hpe.wd5.myworkdayjobs.com',             site: 'hpe/Jobsathpe',                   name: 'HPE' },
    { host: 'workday.wd5.myworkdayjobs.com',         site: 'workday/Workday',                 name: 'Workday' },
    { host: 'analogdevices.wd1.myworkdayjobs.com',   site: 'analogdevices/External',          name: 'Analog Devices' },
    { host: 'cadence.wd1.myworkdayjobs.com',         site: 'cadence/External_Careers',        name: 'Cadence' },
    { host: 'marvell.wd1.myworkdayjobs.com',         site: 'marvell/MarvellCareers',          name: 'Marvell' },
    { host: 'nxp.wd3.myworkdayjobs.com',             site: 'nxp/careers',                     name: 'NXP' },
    { host: 'kainos.wd3.myworkdayjobs.com',          site: 'kainos/kainos',                   name: 'Kainos' },
    { host: 'ciena.wd5.myworkdayjobs.com',           site: 'ciena/Careers',                   name: 'Ciena' },
    { host: 'motorolasolutions.wd5.myworkdayjobs.com', site: 'motorolasolutions/Careers',     name: 'Motorola Solutions' },

    // ── Media / streaming / telecom ──────────────────────────
    { host: 'netflix.wd1.myworkdayjobs.com',         site: 'netflix/Netflix',                 name: 'Netflix' },
    { host: 'disney.wd5.myworkdayjobs.com',          site: 'disney/disneycareer',             name: 'Disney' },
    { host: 'comcast.wd5.myworkdayjobs.com',         site: 'comcast/Comcast_Careers',         name: 'Comcast' },
    { host: 'att.wd1.myworkdayjobs.com',             site: 'att/ATTGeneral',                  name: 'AT&T' },

    // ── Retail ──────────────────────────────────────────────
    { host: 'walmart.wd5.myworkdayjobs.com',         site: 'walmart/WalmartExternal',         name: 'Walmart' },
    { host: 'target.wd5.myworkdayjobs.com',          site: 'target/targetcareers',            name: 'Target' },

    // ── Consumer electronics / appliances ───────────────────
    { host: 'sonyglobal.wd1.myworkdayjobs.com',      site: 'sonyglobal/SonyGlobalCareers',    name: 'Sony Global' },
    { host: 'sec.wd3.myworkdayjobs.com',             site: 'sec/Samsung_Careers',             name: 'Samsung Electronics' },
    { host: 'philips.wd3.myworkdayjobs.com',         site: 'philips/jobs-and-careers',        name: 'Philips' },

    // ── Auto ────────────────────────────────────────────────
    { host: 'generalmotors.wd5.myworkdayjobs.com',   site: 'generalmotors/Careers_GM',        name: 'General Motors' },
    { host: 'toyota.wd503.myworkdayjobs.com',        site: 'toyota/TMNA',                     name: 'Toyota North America' },
    { host: 'toyotaau.wd3.myworkdayjobs.com',        site: 'toyotaau/Careers',                name: 'Toyota Australia' },

    // ── Insurance / banking ─────────────────────────────────
    { host: 'aig.wd1.myworkdayjobs.com',             site: 'aig/AIG',                         name: 'AIG' },
    { host: 'geico.wd1.myworkdayjobs.com',           site: 'geico/External',                  name: 'GEICO' },
    { host: 'rbc.wd3.myworkdayjobs.com',             site: 'rbc/RBCEARLYTALENT1',             name: 'RBC' },
    { host: 'bmo.wd3.myworkdayjobs.com',             site: 'bmo/External',                    name: 'BMO' },
    { host: 'cibc.wd3.myworkdayjobs.com',            site: 'cibc/campus',                     name: 'CIBC' },
    { host: 'manulife.wd3.myworkdayjobs.com',        site: 'manulife/MFCJH_Jobs',             name: 'Manulife' },

    // ── Pharma / healthcare ─────────────────────────────────
    { host: 'pfizer.wd1.myworkdayjobs.com',          site: 'pfizer/PfizerCareers',            name: 'Pfizer' },
    { host: 'astrazeneca.wd3.myworkdayjobs.com',     site: 'astrazeneca/Careers',             name: 'AstraZeneca' },
    { host: 'sanofi.wd3.myworkdayjobs.com',          site: 'sanofi/SanofiCareers',            name: 'Sanofi' },
    { host: 'gsk.wd5.myworkdayjobs.com',             site: 'gsk/GSKCareers',                  name: 'GSK' },
    { host: 'cvshealth.wd1.myworkdayjobs.com',       site: 'cvshealth/CVS_Health_Careers',    name: 'CVS Health' },

    // ── myworkdaysite.com sister-host pattern ───────────────
    { host: 'wd1.myworkdaysite.com',                 site: 'wf/WellsFargoJobs',               name: 'Wells Fargo' },
    { host: 'wd1.myworkdaysite.com',                 site: 'abinbev/GHQ',                     name: 'AB InBev' },
    { host: 'wd1.myworkdaysite.com',                 site: 'ssctech/SSCTechnologies',         name: 'SS&C Technologies' },
    { host: 'wd1.myworkdaysite.com',                 site: 'avnet/External',                  name: 'Avnet' },
];

const REQUEST_TIMEOUT = 8000;
const PER_TENANT_LIMIT = 20; // Workday silently clamps >20 on most tenants
const CONCURRENCY = 8;

/**
 * Query a single Workday tenant for jobs matching searchText.
 * Supports both URL families:
 *   1. {tenant}.{wdN}.myworkdayjobs.com → host has dots, /wday/cxs/{site}/jobs
 *   2. {wdN}.myworkdaysite.com → /wday/cxs/{site}/jobs (same path structure)
 */
async function queryTenant(tenant, searchText) {
    const url = `https://${tenant.host}/wday/cxs/${tenant.site}/jobs`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                appliedFacets: {},
                limit: PER_TENANT_LIMIT,
                offset: 0,
                searchText: searchText,
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });

        if (!res.ok) return [];
        const data = await res.json();
        const postings = data.jobPostings || [];

        // Build the apply URL from externalPath. The site path includes the tenant prefix
        // (e.g. "nvidia/NVIDIAExternalCareerSite") — we need just the second part for the URL.
        const sitePathOnly = tenant.site.split('/').slice(1).join('/') || tenant.site;
        const baseUrl = `https://${tenant.host}/${sitePathOnly}`;

        return postings.map(p => ({
            id: p.bulletFields?.[0] || '',
            title: p.title || '',
            company: tenant.name,
            location: p.locationsText || '',
            date_posted: p.postedOn || '',
            apply_url: p.externalPath ? baseUrl + p.externalPath : '',
            source: `Workday (${tenant.name})`,
            summary: '', // Search endpoint doesn't return descriptions — use queryJobDetail() for full JD
        })).filter(j => j.title);
    } catch {
        return [];
    }
}

/**
 * Fetch full job description by externalPath.
 * Returns jobPostingInfo.jobDescription HTML, or null if unavailable.
 * Use sparingly — only when user clicks into a job (not for every search result).
 */
export async function queryJobDetail(tenant, externalPath) {
    const url = `https://${tenant.host}/wday/cxs/${tenant.site}/job${externalPath}`;
    try {
        const res = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.jobPostingInfo || null;
    } catch {
        return null;
    }
}

/**
 * Run async tasks with a concurrency limit.
 */
async function runWithConcurrency(tasks, limit) {
    const results = [];
    let idx = 0;
    async function worker() {
        while (idx < tasks.length) {
            const i = idx++;
            try {
                results[i] = await tasks[i]();
            } catch {
                results[i] = [];
            }
        }
    }
    const workers = Array(Math.min(limit, tasks.length)).fill(0).map(worker);
    await Promise.all(workers);
    return results;
}

/**
 * Filter jobs by location relevance (since Workday tenants are global).
 * If user wants India jobs, only return jobs whose locationsText mentions India/Bengaluru/Mumbai/etc.
 */
function filterByLocation(jobs, userLocation, userCountry) {
    if (!userLocation && !userCountry) return jobs;

    const country = (userCountry || '').toLowerCase();
    const city = (userLocation || '').split(',')[0].trim().toLowerCase();

    // Use word-boundary regex to avoid "india" matching "indiana"
    const patterns = [];
    if (city) patterns.push(new RegExp(`\\b${city}\\b`, 'i'));

    if (country === 'in' || country === 'india') {
        // Match India only when it's a standalone word, not part of "indiana"/"indianapolis"
        patterns.push(/\bindia\b/i, /\bbengaluru\b/i, /\bbangalore\b/i, /\bmumbai\b/i,
                      /\bdelhi\b/i, /\bhyderabad\b/i, /\bchennai\b/i, /\bpune\b/i,
                      /\bkolkata\b/i, /\bgurgaon\b/i, /\bgurugram\b/i, /\bnoida\b/i,
                      /\bahmedabad\b/i, /\bkochi\b/i, /\bjaipur\b/i);
    } else if (country === 'us' || country === 'usa') {
        patterns.push(/\busa?\b/i, /\bunited states\b/i, /\bnew york\b/i, /\bcalifornia\b/i,
                      /\btexas\b/i, /\bremote\b/i);
    } else if (country === 'gb' || country === 'uk') {
        patterns.push(/\buk\b/i, /\bunited kingdom\b/i, /\blondon\b/i, /\bengland\b/i);
    }

    if (patterns.length === 0) return jobs;

    return jobs.filter(j => {
        const loc = j.location || '';
        return patterns.some(p => p.test(loc));
    });
}

/**
 * Main fetch function — query all Workday tenants in parallel for the user's queries.
 *
 * @param {string[]} queries - Search query strings (uses first as searchText)
 * @param {string} location - User location string
 * @param {object} preferences - User preferences
 * @returns {Promise<object[]>}
 */
export async function fetchWorkdayPublic(queries, location, preferences = {}) {
    if (!queries || queries.length === 0) return [];

    // Use the first query as the search term — Workday's search is keyword-based and can match titles
    const searchText = typeof queries[0] === 'string' ? queries[0] : (queries[0].q || queries[0]);
    if (!searchText) return [];

    // Build task list — one query per tenant
    const tasks = WORKDAY_TENANTS.map(t => () => queryTenant(t, searchText));

    const allResults = await runWithConcurrency(tasks, CONCURRENCY);
    const allJobs = allResults.flat();

    // Dedup by company + title
    const seen = new Set();
    const unique = [];
    for (const job of allJobs) {
        const key = `${job.company.toLowerCase()}::${job.title.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(job);
    }

    // Filter by location relevance
    const filtered = filterByLocation(unique, location, preferences.country);

    return filtered;
}

export { WORKDAY_TENANTS, queryTenant };
