// lib/jd-enricher.js — Fetch full job descriptions from apply URLs
// for jobs with thin snippets. No LLM calls — pure HTTP + text extraction.
// Used in the streaming pipeline to give Panda better text to match against.

const THIN_THRESHOLD = 150; // If summary < 150 chars, it's likely a snippet
const FETCH_TIMEOUT = 4000; // 4s max per JD fetch
const MAX_CONCURRENT = 8;   // Parallel fetch limit
const MAX_JD_LENGTH = 3000; // Cap saved text to avoid bloat

// Domains/patterns to skip (login walls, PDFs, files)
const SKIP_PATTERNS = [
    /\.pdf$/i,
    /\.doc$/i,
    /\/login/i,
    /\/sign-?in/i,
    /lever\.co\/.*\/apply/i,  // Lever apply forms don't have JD text
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
async function fetchJobText(url) {
    if (!url) return null;
    if (SKIP_PATTERNS.some(p => p.test(url))) return null;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; MidasBot/1.0)',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            redirect: 'follow',
        });

        clearTimeout(timeout);

        if (!res.ok) return null;

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/html') && !contentType.includes('text/plain')) return null;

        const html = await res.text();
        return extractTextFromHTML(html);
    } catch {
        return null; // Timeout, network error, etc.
    }
}

/**
 * Extracts readable text from HTML, stripping tags, scripts, styles, and nav.
 * Focuses on the main content area where JD text typically lives.
 */
function extractTextFromHTML(html) {
    if (!html) return null;

    // Remove script, style, nav, header, footer blocks
    let text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
        .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ');

    // Replace tags with spaces, decode entities, collapse whitespace
    text = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?(p|div|li|h[1-6]|tr|td|th|section|article)[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&#x27;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim();

    // If text is too short after extraction, it's probably not useful
    if (text.length < 100) return null;

    // Cap length
    return text.slice(0, MAX_JD_LENGTH);
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
