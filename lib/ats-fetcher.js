// lib/ats-fetcher.js — Query company career pages via ATS APIs (Greenhouse, Lever, Ashby)
//
// These are real, public, unauthenticated APIs. Each company's career page is
// powered by one of these three platforms and exposes a JSON feed of open roles.

import { GREENHOUSE_COMPANIES, LEVER_COMPANIES, ASHBY_COMPANIES } from './ats-companies.js';
import { getCachedJobs, cacheJobs } from './cache.js';
import { log, warn } from './logger.js';

const ATS_TIMEOUT = 3000; // Per-board timeout — reduced from 6s to allow more boards in 45s window
const ATS_CACHE_TTL = 43200; // 12 hours — ATS listings change once/day at most

// ─── Concurrency limiter ─────────────────────────────────────────────────────

/**
 * Run an array of async-factory functions with a concurrency cap.
 * @param {(() => Promise<T>)[]} tasks — zero-arg functions that return a promise
 * @param {number} limit
 * @returns {Promise<PromiseSettledResult<T>[]>}
 */
/**
 * Run tasks with concurrency cap, pushing results into a shared array as they complete.
 * Returns a promise that resolves when all tasks finish OR after timeoutMs, whichever first.
 * Partial results accumulated before timeout are preserved in `collector`.
 */
async function runWithConcurrencyStreaming(tasks, limit, collector, timeoutMs) {
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      try {
        const result = await tasks[i]();
        if (Array.isArray(result)) collector.push(...result);
      } catch {
        // individual board errors are already logged inside the task
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.race([
    Promise.all(workers),
    new Promise(resolve => setTimeout(resolve, timeoutMs)),
  ]);
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
// Role title synonyms — ensures ATS search catches all common variants
const TITLE_SYNONYMS = {
  'customer experience': ['customer support', 'customer success', 'client services', 'client success', 'cx'],
  'customer support': ['customer experience', 'customer success', 'client services', 'cx'],
  'customer success': ['customer experience', 'customer support', 'client success', 'cx'],
  'software engineer': ['software developer', 'backend engineer', 'frontend engineer', 'fullstack engineer'],
  'software developer': ['software engineer', 'web developer', 'application developer'],
  'data analyst': ['business analyst', 'analytics engineer', 'bi analyst'],
  'data scientist': ['machine learning engineer', 'ml engineer', 'ai engineer'],
  'product manager': ['product owner', 'program manager'],
  'ux designer': ['product designer', 'ui designer', 'interaction designer'],
  'devops engineer': ['sre', 'site reliability', 'platform engineer', 'infrastructure engineer'],
  'account manager': ['account executive', 'client manager', 'relationship manager'],
  'technical account manager': ['solutions engineer', 'customer engineer', 'tam'],
  'project manager': ['program manager', 'delivery manager'],
  'content writer': ['copywriter', 'content strategist', 'technical writer'],
  'sales manager': ['business development', 'account executive', 'sales lead'],
};

function buildSearchTerms(queries) {
  const terms = new Set();
  for (const q of queries) {
    const lower = q.toLowerCase();
    // Add compound phrases (2-word pairs) as strong search terms.
    const words = lower.split(/[\s\-\/,.()+]+/).map(w => w.replace(/[^a-z0-9]/g, '')).filter(w => w.length >= 2);
    for (let i = 0; i < words.length - 1; i++) {
      if (!STOP_WORDS.has(words[i]) && !STOP_WORDS.has(words[i + 1])) {
        terms.add(`${words[i]} ${words[i + 1]}`);
      }
    }
    // Add individual words
    for (const word of words) {
      if (word.length >= 3 && !STOP_WORDS.has(word)) terms.add(word);
    }
    // Expand synonyms for compound phrases
    for (const [phrase, synonyms] of Object.entries(TITLE_SYNONYMS)) {
      if (lower.includes(phrase)) {
        for (const syn of synonyms) {
          terms.add(syn);
          // Also add individual words from multi-word synonyms
          for (const w of syn.split(' ')) {
            if (w.length >= 3 && !STOP_WORDS.has(w)) terms.add(w);
          }
        }
      }
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

  // Generic words match too broadly on their own ("manager", "lead", "operations").
  // Require at least 2 search term hits to qualify, unless one of the hits is
  // a strong, multi-word term (e.g., "customer experience", "customer success").
  const WEAK_TERMS = new Set([
    'manager', 'lead', 'head', 'director', 'senior', 'associate', 'specialist',
    'operations', 'technical', 'enterprise', 'account', 'global', 'regional',
    'staff', 'principal', 'support', 'service', 'product', 'business',
  ]);

  let hits = 0;
  let hasStrongHit = false;
  for (const term of searchTerms) {
    if (lower.includes(term)) {
      hits++;
      if (!WEAK_TERMS.has(term) || term.includes(' ')) hasStrongHit = true;
    }
  }
  // Accept if: 2+ term hits, OR 1 strong (non-generic) term hit
  return hits >= 2 || hasStrongHit;
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
  } catch (err) {
    warn(`[ATS] Greenhouse query failed: ${err.message}`);
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
  } catch (err) {
    warn(`[ATS] Lever query failed: ${err.message}`);
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
  } catch (err) {
    warn(`[ATS] Ashby query failed: ${err.message}`);
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

  // Run all with concurrency=50, collecting partial results as boards complete.
  // Stop after 45s — boards that finish before timeout contribute jobs; the rest are dropped.
  // 3s per-board timeout + 50 concurrency → ~750 boards coverable in 45s.
  const ATS_GLOBAL_TIMEOUT = 45000;
  const allJobs = [];
  await runWithConcurrencyStreaming(tasks, 50, allJobs, ATS_GLOBAL_TIMEOUT);


  // Cache results for 12 hours — aggressively slim to stay under Upstash 1MB request limit
  if (allJobs.length > 0) {
    const slimJobs = allJobs.slice(0, 500).map(j => ({
      title: j.title,
      company: j.company,
      location: j.location,
      apply_url: j.apply_url,
      source: j.source,
      date_posted: j.date_posted,
      description: (j.description || '').slice(0, 200),
    }));
    // Chunk into 250-job batches to avoid 1MB/10MB request size limits
    const CHUNK_SIZE = 250;
    for (let i = 0; i < slimJobs.length; i += CHUNK_SIZE) {
      const chunk = slimJobs.slice(i, i + CHUNK_SIZE);
      const chunkKey = i === 0 ? cacheKey : `${cacheKey}:${i}`;
      await cacheJobs(chunkKey, chunk, ATS_CACHE_TTL);
    }
  }

  log(`[ATS] Done — ${allJobs.length} matching jobs from ${tasks.length} boards queried`);
  return allJobs;
}

/** Simple title-casing for company display names */
function titleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}
