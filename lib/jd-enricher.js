// lib/jd-enricher.js — Fetch full job descriptions from apply URLs
// for jobs with thin snippets. No LLM calls — pure HTTP + text extraction.
// Used in the streaming pipeline to give Panda better text to match against.

const THIN_THRESHOLD = 200; // If summary < 200 chars, it's likely a snippet or synthetic
const FETCH_TIMEOUT = 12000; // 12s — career pages often need headless rendering
const MAX_CONCURRENT = 15;   // Parallel fetch limit — spread across many domains
const MAX_JD_LENGTH = 5000; // Cap saved text to match source fetch limits

// Domains/patterns to skip (login walls, PDFs, files)
const SKIP_PATTERNS = [
    /\.pdf$/i,
    /\.doc$/i,
    /\/login/i,
    /\/sign-?in/i,
    /lever\.co\/.*\/apply/i,
    /linkedin\.com/i,
    /\.linkedin\./i,
];

/**
 * Determines if a job has a thin description that would benefit from enrichment.
 */
export function isThinJD(job) {
    const summary = (job.summary || job.description || '').trim();
    return summary.length < THIN_THRESHOLD;
}

/**
 * Fetches and extracts readable text from a job's apply URL.
 * Returns the extracted text, or null if fetch fails/times out.
 */
async function fetchJobText(url, attempt = 0) {
    if (!url) return null;
    if (SKIP_PATTERNS.some(p => p.test(url))) return null;

    try {
        const apiKey = process.env.FIRECRAWL_API_KEY || 'fc-a417335210ac4d62ac120e72d034f26e';

        const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
            method: 'POST',
            signal: AbortSignal.timeout(FETCH_TIMEOUT),
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url,
                formats: ['markdown']
            }),
        });

        if (!res.ok) {
            if (attempt === 0 && res.status >= 500) return fetchJobText(url, 1);
            return null;
        }

        const data = await res.json();
        let text = data?.data?.markdown || '';

        if (text.length < 100) return null;

        return text.slice(0, MAX_JD_LENGTH);
    } catch (err) {
        if (attempt === 0) return fetchJobText(url, 1);
        return null;
    }
}

/**
 * Enriches a batch of jobs by fetching full JDs for thin-description ones.
 * Mutates jobs in place — sets job.summary to the enriched text.
 * Returns count of enriched jobs.
 *
 * @param {Array} jobs - Array of job objects
 * @returns {Promise<number>} Number of jobs enriched
 */
export async function enrichThinJDs(jobs) {
    const thinJobs = jobs.filter(isThinJD);
    if (thinJobs.length === 0) return 0;

    let enrichedCount = 0;

    // Process in batches to respect concurrency limit
    for (let i = 0; i < thinJobs.length; i += MAX_CONCURRENT) {
        const batch = thinJobs.slice(i, i + MAX_CONCURRENT);
        const results = await Promise.allSettled(
            batch.map(async (job) => {
                const url = job.apply_url || job.url;
                const fullText = await fetchJobText(url);
                if (fullText && fullText.length > (job.summary || '').length) {
                    // Prepend original summary so we don't lose any existing info
                    const original = (job.summary || '').trim();
                    job.summary = original
                        ? `${original}\n\n${fullText}`
                        : fullText;
                    job._enriched = true;
                    return true;
                }
                return false;
            })
        );
        enrichedCount += results.filter(r => r.status === 'fulfilled' && r.value).length;
    }

    return enrichedCount;
}
