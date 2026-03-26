// lib/ats-fetcher.js — Query company career pages via ATS APIs (Greenhouse, Lever, Ashby)
//
// These are real, public, unauthenticated APIs. Each company's career page is
// powered by one of these three platforms and exposes a JSON feed of open roles.

import { GREENHOUSE_COMPANIES, LEVER_COMPANIES, ASHBY_COMPANIES } from './ats-companies.js';
import { getCachedJobs, cacheJobs } from './cache.js';
import { log, warn } from './logger.js';

const ATS_TIMEOUT = 8000; // These APIs typically respond in 200-500ms
const ATS_CACHE_TTL = 21600; // 6 hours — balance freshness vs Upstash memory
const MAX_JOBS_PER_COMPANY = 10; // Prevent any single company from flooding results

// ─── Concurrency limiter ─────────────────────────────────────────────────────

/**
 * Run an array of async-factory functions with a concurrency cap.
 * @param {(() => Promise<T>)[]} tasks — zero-arg functions that return a promise
 * @param {number} limit
 * @returns {Promise<PromiseSettledResult<T>[]>}
 */
async function runWithConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]() };
      } catch (err) {
        results[i] = { status: 'rejected', reason: err };
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ─── Keyword helpers ─────────────────────────────────────────────────────────

/** Words too common / short to be useful search signals */
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'will',
  'can', 'has', 'have', 'been', 'not', 'but', 'they', 'all', 'any', 'who',
  'our', 'you', 'your', 'their', 'its',
]);

/**
 * Build meaningful search terms from the user's queries.
 * Returns lowercase tokens >=3 chars, minus stopwords.
 */
function buildSearchTerms(queries) {
  const terms = new Set();
  for (const q of queries) {
    for (const word of q.toLowerCase().split(/[\s\-\/,.()+]+/)) {
      const clean = word.replace(/[^a-z0-9]/g, '');
      if (clean.length >= 3 && !STOP_WORDS.has(clean)) terms.add(clean);
    }
  }
  return [...terms];
}

/**
 * Does the job title contain any of the search terms?
 * Uses token overlap — at least one significant keyword must appear.
 */
function titleMatchesSearch(title, searchTerms) {
  if (!searchTerms.length) return true; // no filter
  const lower = title.toLowerCase();
  return searchTerms.some(term => lower.includes(term));
}

// Country/region signals used for ATS remote-job geo-filtering
// Uses word-boundary regex patterns to avoid partial matches like 'us' inside 'focus'
const COUNTRY_GEO_PATTERNS = {
  us: [/\bus\b/i, /\busa\b/i, /\bunited states\b/i, /\bnew york\b/i, /\bsan francisco\b/i, /\bseattle\b/i, /\bchicago\b/i, /\baustin\b/i, /\bboston\b/i, /\blos angeles\b/i, /\bdenver\b/i, /\bpalo alto\b/i, /\bmountain view\b/i, /\bsf bay\b/i, /\bbay area\b/i, /\bcharlotte\b/i, /\bpittsburgh\b/i, /\bphiladelphia\b/i, /\bphoenix\b/i, /\bdallas\b/i, /\bhouston\b/i, /\btysons\b/i, /\bwilmington\b/i, /\bnashville\b/i, /\braleigh\b/i, /\brichmond\b/i, /,\s*(?:AL|AK|AZ|AR|CO|CT|DE|FL|GA|HI|IL|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|NY)\b/],
  uk: [/\buk\b/i, /\bunited kingdom\b/i, /\blondon\b/i, /\bmanchester\b/i, /\bedinburgh\b/i, /\bglasgow\b/i, /\bcambridge\b/i, /\boxford\b/i],
  in: [/\bindia\b/i, /\bbangalore\b/i, /\bbengaluru\b/i, /\bmumbai\b/i, /\bdelhi\b/i, /\bhyderabad\b/i, /\bpune\b/i, /\bchennai\b/i, /\bkolkata\b/i, /\bgurgaon\b/i, /\bgurugram\b/i, /\bnoida\b/i, /\bkochi\b/i, /\bahmedabad\b/i],
  ca: [/\bcanada\b/i, /\btoronto\b/i, /\bvancouver\b/i, /\bmontreal\b/i, /\bottawa\b/i, /\bcalgary\b/i],
  de: [/\bgermany\b/i, /\bdeutschland\b/i, /\bberlin\b/i, /\bmunich\b/i, /\bfrankfurt\b/i, /\bhamburg\b/i, /\bstuttgart\b/i],
  au: [/\baustralia\b/i, /\bsydney\b/i, /\bmelbourne\b/i, /\bbrisbane\b/i, /\bperth\b/i],
  sg: [/\bsingapore\b/i],
  ae: [/\buae\b/i, /\bdubai\b/i, /\babu dhabi\b/i, /\bunited arab emirates\b/i],
  kr: [/\bkorea\b/i, /\bseoul\b/i, /\bbusan\b/i, /\bincheon\b/i],
  cn: [/\bchina\b/i, /\bshanghai\b/i, /\bbeijing\b/i, /\bshenzhen\b/i, /\bhangzhou\b/i, /\bguangzhou\b/i],
  pl: [/\bpoland\b/i, /\bwarsaw\b/i, /\bkrakow\b/i, /\bkrak[óo]w\b/i, /\bwroclaw\b/i, /\bwroc[łl]aw\b/i],
  es: [/\bspain\b/i, /\bmadrid\b/i, /\bbarcelona\b/i],
  it: [/\bitaly\b/i, /\bmilan\b/i, /\brome\b/i],
  se: [/\bsweden\b/i, /\bstockholm\b/i],
  ch: [/\bswitzerland\b/i, /\bzurich\b/i, /\bgeneva\b/i],
  emea: [/\bemea\b/i],
  apac: [/\bapac\b/i],
  eu: [/\beurope\b/i],
  tw: [/\btaiwan\b/i],
  jp: [/\bjapan\b/i, /\btokyo\b/i, /\bosaka\b/i],
  fr: [/\bfrance\b/i, /\bparis\b/i],
  nl: [/\bnetherlands\b/i, /\bamsterdam\b/i],
  ie: [/\bireland\b/i, /\bdublin\b/i],
  br: [/\bbrazil\b/i],
  mx: [/\bmexico\b/i],
  ar: [/\bargentina\b/i, /\bbuenos aires\b/i],
  co: [/\bcolombia\b/i, /\bbogot[áa]\b/i],
  il: [/\bisrael\b/i, /\btel aviv\b/i],
};

/**
 * Location match for ATS jobs. Checks if a job's location overlaps with
 * the user's desired location. Uses word-boundary regex for geo-detection.
 */
function locationMatches(jobLocation, desiredLocation) {
  if (!desiredLocation) return true;
  if (!jobLocation) return !desiredLocation; // no location + user wants specific geo = exclude
  const jl = jobLocation.toLowerCase();
  const dl = desiredLocation.toLowerCase();

  // Match on meaningful location words (>=3 chars to avoid "in" from "India" matching everything)
  const desired = dl.split(/[\s,]+/).filter(w => w.length >= 3);
  const hasLocationOverlap = desired.some(w => jl.includes(w));
  if (hasLocationOverlap) return true;

  // "Remote" alone is NOT a pass — check if the job's geo matches the user's geo
  if (jl.includes('remote')) {
    let jobGeo = null;
    for (const [geo, patterns] of Object.entries(COUNTRY_GEO_PATTERNS)) {
      if (patterns.some(p => p.test(jobLocation))) { jobGeo = geo; break; }
    }
    let userGeo = null;
    for (const [geo, patterns] of Object.entries(COUNTRY_GEO_PATTERNS)) {
      if (patterns.some(p => p.test(desiredLocation))) { userGeo = geo; break; }
    }
    // If both have a geo and they differ, reject
    if (jobGeo && userGeo && jobGeo !== userGeo) return false;
    // Pure "Remote" with no country signal — exclude when user wants specific geo
    if (!jobGeo && userGeo) return false;
    return true;
  }

  return false;
}

// ─── Greenhouse ──────────────────────────────────────────────────────────────

async function queryGreenhouse(slug, companyName, searchTerms, location) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATS_TIMEOUT);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];
    const data = await res.json();
    const jobs = (data.jobs || [])
      .filter(j => titleMatchesSearch(j.title, searchTerms))
      .filter(j => locationMatches(j.location?.name, location))
      .slice(0, MAX_JOBS_PER_COMPANY)
      .map(j => ({
        id: `gh-${slug}-${j.id}`,
        title: j.title,
        company: companyName,
        location: j.location?.name || 'Not specified',
        description: stripHTML(j.content || ''),
        apply_url: j.absolute_url,
        source: 'Direct (Greenhouse)',
        date_posted: j.updated_at ? new Date(j.updated_at).toISOString().slice(0, 10) : null,
        is_direct: true,
      }));
    return jobs;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// ─── Lever ───────────────────────────────────────────────────────────────────

async function queryLever(slug, companyName, searchTerms, location) {
  const url = `https://api.lever.co/v0/postings/${slug}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATS_TIMEOUT);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];
    const postings = await res.json();
    if (!Array.isArray(postings)) return [];
    const jobs = postings
      .filter(p => titleMatchesSearch(p.text, searchTerms))
      .filter(p => locationMatches(p.categories?.location, location))
      .slice(0, MAX_JOBS_PER_COMPANY)
      .map(p => ({
        id: `lv-${slug}-${p.id}`,
        title: p.text,
        company: companyName,
        location: p.categories?.location || 'Not specified',
        description: (p.descriptionPlain || ''),
        apply_url: p.hostedUrl || p.applyUrl,
        source: 'Direct (Lever)',
        date_posted: p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : null,
        is_direct: true,
        commitment: p.categories?.commitment || null,
        team: p.categories?.team || null,
      }));
    return jobs;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// ─── Ashby ───────────────────────────────────────────────────────────────────

async function queryAshby(slug, companyName, searchTerms, location) {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${slug}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATS_TIMEOUT);

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const jobList = data.jobs || [];
    const jobs = jobList
      .filter(j => titleMatchesSearch(j.title, searchTerms))
      .filter(j => locationMatches(j.location || j.locationName, location))
      .slice(0, MAX_JOBS_PER_COMPANY)
      .map(j => ({
        id: `ab-${slug}-${j.id}`,
        title: j.title,
        company: companyName,
        location: j.location || j.locationName || 'Not specified',
        description: '',
        apply_url: j.applyUrl || j.jobUrl || `https://jobs.ashbyhq.com/${slug}/${j.id}`,
        source: 'Direct (Ashby)',
        date_posted: j.publishedAt ? new Date(j.publishedAt).toISOString().slice(0, 10) : null,
        is_direct: true,
        employment_type: j.employmentType || null,
      }));
    return jobs;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Strip HTML tags and decode entities from job descriptions.
 *  Handles double-encoded HTML (e.g. &lt;p&gt; → <p> → stripped) */
function stripHTML(html) {
  return html
    // First pass: decode entities (handles double-encoded like &lt;p&gt;)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    // Now strip any HTML tags (both original and decoded)
    .replace(/<[^>]*>/g, ' ')
    // Second pass: decode any remaining entities from the first layer
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Main entry point ────────────────────────────────────────────────────────

/**
 * Query all known ATS boards for jobs matching the user's search.
 * Runs in parallel with other sources — designed to be fast.
 *
 * @param {string[]} queries — Search queries (job titles / keywords)
 * @param {string}   location — Preferred location (optional)
 * @param {Object}   profile — User profile (unused for now, reserved for future targeting)
 * @returns {Promise<Object[]>} — Normalized job objects
 */
export async function fetchATSJobs(queries, location, profile) {
  if (!queries || queries.length === 0) return [];

  const searchTerms = buildSearchTerms(queries);
  if (searchTerms.length === 0) return [];

  // Check cache first — ATS listings don't change hourly
  const cacheKey = `ats_${searchTerms.slice(0, 6).sort().join('_')}_${(location || 'global').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  const cached = await getCachedJobs(cacheKey);
  if (cached && Array.isArray(cached) && cached.length > 0) {
    log(`[ATS] Cache HIT: ${cached.length} jobs (key: ${cacheKey})`);
    return cached;
  }

  log(`[ATS] Cache MISS — querying ${Object.keys(GREENHOUSE_COMPANIES).length} Greenhouse + ${Object.keys(LEVER_COMPANIES).length} Lever + ${Object.keys(ASHBY_COMPANIES).length} Ashby boards for terms: [${searchTerms.slice(0, 8).join(', ')}]`);

  // Build task factories (zero-arg fns that return promises)
  const tasks = [];

  for (const [company, slug] of Object.entries(GREENHOUSE_COMPANIES)) {
    tasks.push(() => queryGreenhouse(slug, titleCase(company), searchTerms, location));
  }
  for (const [company, slug] of Object.entries(LEVER_COMPANIES)) {
    tasks.push(() => queryLever(slug, titleCase(company), searchTerms, location));
  }
  for (const [company, slug] of Object.entries(ASHBY_COMPANIES)) {
    tasks.push(() => queryAshby(slug, titleCase(company), searchTerms, location));
  }

  // Run all with concurrency cap of 20
  const results = await runWithConcurrency(tasks, 20);

  // Flatten fulfilled results
  const allJobs = [];
  let successes = 0;
  let failures = 0;
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      allJobs.push(...r.value);
      if (r.value.length > 0) successes++;
    } else if (r.status === 'rejected') {
      failures++;
    }
  }

  // Cache results for 12 hours — truncate descriptions to stay under Upstash 10MB limit
  if (allJobs.length > 0) {
    const slimJobs = allJobs.map(j => ({
      ...j,
      description: (j.description || '').slice(0, 200),
    }));
    await cacheJobs(cacheKey, slimJobs, ATS_CACHE_TTL);
  }

  log(`[ATS] Done — ${allJobs.length} matching jobs from ${successes} boards (${failures} boards failed/timed out)`);
  return allJobs;
}

/** Simple title-casing for company display names */
function titleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}
