// lib/ats-fetcher.js — Query company career pages via ATS APIs (Greenhouse, Lever, Ashby)
//
// These are real, public, unauthenticated APIs. Each company's career page is
// powered by one of these three platforms and exposes a JSON feed of open roles.

import { GREENHOUSE_COMPANIES, LEVER_COMPANIES, ASHBY_COMPANIES } from './ats-companies.js';
import { getCachedJobs, cacheJobs } from './cache.js';
import { log, warn } from './logger.js';

const ATS_TIMEOUT = 8000; // These APIs typically respond in 200-500ms
const ATS_CACHE_TTL = 43200; // 12 hours — ATS listings change once/day at most

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

/**
 * Rough location match: check if a job's location string overlaps with the
 * user's desired location. Very lenient — returns true if no location filter.
 */
function locationMatches(jobLocation, desiredLocation) {
  if (!desiredLocation) return true;
  if (!jobLocation) return true; // unknown location = don't filter out
  const jl = jobLocation.toLowerCase();
  const dl = desiredLocation.toLowerCase();
  // Check for word overlap (city, state, country, "remote")
  const desired = dl.split(/[\s,]+/).filter(w => w.length >= 2);
  return desired.some(w => jl.includes(w)) || jl.includes('remote');
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

  // Cache results for 12 hours
  if (allJobs.length > 0) {
    await cacheJobs(cacheKey, allJobs, ATS_CACHE_TTL);
  }

  log(`[ATS] Done — ${allJobs.length} matching jobs from ${successes} boards (${failures} boards failed/timed out)`);
  return allJobs;
}

/** Simple title-casing for company display names */
function titleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}
