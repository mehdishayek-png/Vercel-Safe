// lib/job-fetcher.js — Fetch jobs from all sources (ported from Python)

import { getCachedJobs, cacheJobs, slimJobsForCache } from './cache.js';
import { normalizeSkillsForSearch, rankSkillsForSearch } from './skill-normalizer.js';
import { log, warn, error as logError } from './logger.js';
import { fetchATSJobs } from './ats-fetcher.js';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { withCircuitBreaker } from './circuit-breaker.js';
import { getSourcesByPhase, SOURCE_REGISTRY } from './sources/registry.js';

const NETWORK_TIMEOUT = 25000;

const REMOTEOK_FEED = 'https://remoteok.com/remote-jobs.rss';
const JOBICY_FEED = 'https://jobicy.com/feed/newjobs';
const SIMPLYHIRED_FEED = 'https://www.simplyhired.com/search/rss';

// ---- Aggregator blocklist: domains that force sign-up / don't lead to real applications ----
const AGGREGATOR_DOMAINS = new Set([
  'jubil.co', 'jubil.com',
  'jobrapido.com',
  'talent.com', 'neuvoo.com',
  'jooble.org',
  'careerjet.com',
  'recruit.net',
  'adzuna.com',           // when it redirects to their own listing page
  'ziprecruiter.com',
  'simplyhired.com',
  'snagajob.com',
  'lensa.com',
  'salary.com',
  'learn4good.com',
  'jobleads.com',
  'jobsora.com',
  'jobisjob.com',
  'whatjobs.com',
  'jobs2careers.com',
  'nexxt.com',
  'jobvertise.com',
  'jobtome.com',
  'clickajobs.com',
  'jobcase.com',
  'getwork.com',
  'upwork.com',            // freelance, not job applications
  'postjobfree.com',
  'startwire.com',
  'jobstore.com',
  'mycareersfuture.gov.sg',
]);

// Domains that are legit job boards — not great, but acceptable as fallback
const ACCEPTABLE_BOARDS = new Set([
  'linkedin.com',
  'indeed.com',
  'glassdoor.com',
  'monster.com',
  'dice.com',
  'wellfound.com',        // AngelList
  'naukri.com',
  'foundit.in',
  'greenhouse.io',
  'lever.co',
  'workday.com',
  'smartrecruiters.com',
  'icims.com',
  'myworkdayjobs.com',
  'jobvite.com',
  'ashbyhq.com',
  'rippling.com',
  'bamboohr.com',
  'breezy.hr',
  'recruitee.com',
  'workable.com',
  'applytojob.com',
  'dover.com',
  'jobs.lever.co',
  'boards.greenhouse.io',
]);

/**
 * Pick the best apply URL from SerpAPI's apply_options array.
 * Priority: company career page > ATS (Greenhouse/Lever/Workday) > LinkedIn/Indeed > aggregator > fallback
 */
function pickBestApplyUrl(applyOptions, companyName, jobTitle, jobId, queryText) {
  if (!applyOptions || applyOptions.length === 0) {
    return _buildFallbackUrl(companyName, jobTitle, jobId, queryText);
  }

  const directLinks = [];   // Company's own domain
  const atsLinks = [];      // Greenhouse, Lever, Workday, etc.
  const boardLinks = [];    // LinkedIn, Indeed, etc.
  const aggregatorLinks = []; // Trash middlemen

  for (const opt of applyOptions) {
    const url = opt.link;
    if (!url) continue;

    let hostname;
    try {
      hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      continue;
    }

    // Check if it's an aggregator
    if (_isAggregator(hostname)) {
      aggregatorLinks.push(url);
      continue;
    }

    // Check if it's an ATS platform
    if (_isATS(hostname)) {
      atsLinks.push(url);
      continue;
    }

    // Check if it's a known job board
    if (_isBoard(hostname)) {
      boardLinks.push(url);
      continue;
    }

    // Everything else is likely a direct company link
    directLinks.push(url);
  }

  // Return best option in priority order
  if (directLinks.length > 0) return directLinks[0];
  if (atsLinks.length > 0) return atsLinks[0];
  if (boardLinks.length > 0) return boardLinks[0];
  if (aggregatorLinks.length > 0) {
    // All links are aggregators — build a direct career page search instead
    return _buildFallbackUrl(companyName, jobTitle, jobId, queryText);
  }

  return _buildFallbackUrl(companyName, jobTitle, jobId, queryText);
}

function _isAggregator(hostname) {
  for (const domain of AGGREGATOR_DOMAINS) {
    if (hostname === domain || hostname.endsWith('.' + domain)) return true;
  }
  return false;
}

function _isATS(hostname) {
  const ats = ['greenhouse.io', 'lever.co', 'workday.com', 'myworkdayjobs.com',
    'smartrecruiters.com', 'icims.com', 'jobvite.com', 'ashbyhq.com',
    'bamboohr.com', 'breezy.hr', 'recruitee.com', 'workable.com',
    'applytojob.com', 'dover.com', 'rippling.com', 'taleo.net',
    'jobs.lever.co', 'boards.greenhouse.io'];
  return ats.some(d => hostname === d || hostname.endsWith('.' + d));
}

function _isBoard(hostname) {
  for (const domain of ACCEPTABLE_BOARDS) {
    if (hostname === domain || hostname.endsWith('.' + domain)) return true;
  }
  return false;
}

function _buildFallbackUrl(companyName, jobTitle, jobId, queryText) {
  // If we have a job_id, construct a direct Google Jobs URL
  if (jobId) {
    const searchQ = encodeURIComponent(queryText || `${jobTitle} ${companyName}`);
    return `https://www.google.com/search?q=${searchQ}&ibp=htl;jobs&htidocid=${jobId}`;
  }
  // Otherwise, search for the company's career page directly
  const searchQ = encodeURIComponent(`${companyName} careers ${jobTitle}`);
  return `https://www.google.com/search?q=${searchQ}`;
}

// ---- RSS Parser (lightweight, no external dep) ----
function parseRSSItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 's'));
      return m ? m[1].trim() : '';
    };
    items.push({
      title: get('title'),
      link: get('link'),
      description: get('description'),
      pubDate: get('pubDate'),
    });
  }
  return items;
}

function stripHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function extractCompanyFromTitle(title) {
  if (!title) return ['Unknown', title || ''];
  // "Company: Job Title" or "Company - Job Title"
  for (const sep of [':', ' - ', ' – ', ' | ']) {
    const idx = title.indexOf(sep);
    if (idx > 2 && idx < title.length - 3) {
      return [title.slice(0, idx).trim(), title.slice(idx + sep.length).trim()];
    }
  }
  return ['Unknown', title];
}

// ---- Location tagging ----
const REGION_KEYWORDS = {
  americas: ['americas', 'north america', 'est ', 'pst ', 'cst ', 'us only', 'usa only', 'eastern time', 'pacific time'],
  europe: ['emea', 'europe', 'cet ', 'gmt', 'uk only', 'european hours'],
  asia: ['apac', 'asia', 'ist ', 'india', 'singapore', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad'],
  global: ['anywhere', 'worldwide', 'global', 'any timezone', 'fully remote', 'work from anywhere'],
};

function extractLocationTags(text) {
  if (!text) return ['global'];
  const lower = text.toLowerCase();
  const tags = new Set();
  for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) { tags.add(region); break; }
    }
  }
  return tags.size ? [...tags].sort() : ['global'];
}

// ---- Fetch RSS ----
async function fetchRSS(url, sourceName, maxItems = 50) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Midas/1.0' },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const xml = await res.text();
    const items = parseRSSItems(xml);

    return items.slice(0, maxItems).map(item => {
      const [company, title] = extractCompanyFromTitle(item.title);
      const summary = stripHtml(item.description).slice(0, 1000);
      return {
        title: title || item.title,
        company,
        summary,
        apply_url: item.link,
        source: sourceName,
        date_posted: item.pubDate || '',
        location: '',
        location_tags: extractLocationTags(`${title} ${summary}`),
      };
    });
  } catch (e) {
    logError(`RSS ${sourceName} failed:`, e.message);
    return [];
  }
}

// ---- Fetch Remotive API ----
async function fetchRemotive() {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?limit=30', {
      signal: AbortSignal.timeout(NETWORK_TIMEOUT),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs || []).map(j => ({
      title: j.title || '',
      company: j.company_name || 'Unknown',
      summary: stripHtml(j.description || '').slice(0, 5000),
      apply_url: j.url || '',
      source: 'Remotive',
      date_posted: j.publication_date || '',
      location: j.candidate_required_location || '',
      location_tags: extractLocationTags(`${j.title} ${j.description} ${j.candidate_required_location}`),
    }));
  } catch (e) {
    logError('Remotive failed:', e.message);
    return [];
  }
}

// ---- Fetch Arbeitnow API (free, no key required) ----
async function fetchArbeitnow() {
  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      signal: AbortSignal.timeout(NETWORK_TIMEOUT),
      headers: { 'User-Agent': 'Midas/1.0' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).slice(0, 50).map(j => ({
      title: j.title || '',
      company: j.company_name || 'Unknown',
      summary: stripHtml(j.description || '').slice(0, 5000),
      apply_url: j.url || '',
      source: 'Arbeitnow',
      date_posted: j.created_at || '',
      location: j.location || '',
      location_tags: extractLocationTags(`${j.title} ${j.description} ${j.location}`),
    }));
  } catch (e) {
    logError('Arbeitnow failed:', e.message);
    return [];
  }
}

// ---- Fetch The Muse API (free tier, no key required) ----
async function fetchTheMuse(queries) {
  const allJobs = [];
  const seen = new Set();
  // Use first 2 queries as category search terms
  const searchTerms = (queries || []).slice(0, 2);
  if (!searchTerms.length) searchTerms.push('');

  for (const q of searchTerms) {
    try {
      const params = new URLSearchParams({ page: '0', descending: 'true' });
      if (q) params.set('category', q);

      const url = `https://www.themuse.com/api/public/jobs?${params}`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(NETWORK_TIMEOUT),
        headers: { 'User-Agent': 'Midas/1.0' },
      });
      if (!res.ok) {
        warn(`[THEMUSE] HTTP ${res.status} for "${q}"`);
        continue;
      }
      const data = await res.json();

      for (const j of (data.results || []).slice(0, 25)) {
        const key = `${j.name}__${j.company?.name}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const locParts = (j.locations || []).map(l => l.name).join(', ');
        allJobs.push({
          title: j.name || '',
          company: j.company?.name || 'Unknown',
          summary: stripHtml(j.contents || '').slice(0, 5000),
          apply_url: j.refs?.landing_page || '',
          source: 'The Muse',
          date_posted: j.publication_date || '',
          location: locParts,
          location_tags: extractLocationTags(`${j.name} ${j.contents} ${locParts}`),
        });
      }
      log(`[THEMUSE] "${q || 'all'}" → ${(data.results || []).length} jobs`);
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      logError(`[THEMUSE] "${q}" failed:`, e.message);
    }
  }

  log(`[THEMUSE] Total: ${allJobs.length} jobs`);
  return allJobs;
}

// ---- Fetch USAJOBS API (free, needs API key + email) ----
async function fetchUSAJobs(queries, apiKey) {
  const key = apiKey || process.env.USAJOBS_API_KEY;
  const email = process.env.USAJOBS_EMAIL || 'midas@midasmatch.com';
  if (!key) {
    log('[USAJOBS] SKIPPED: No USAJOBS_API_KEY configured');
    return [];
  }

  const allJobs = [];
  const seen = new Set();

  for (const q of (queries || []).slice(0, 3)) {
    const queryText = typeof q === 'string' ? q : (q.q || q);
    try {
      const params = new URLSearchParams({
        Keyword: queryText,
        ResultsPerPage: '25',
      });
      const res = await fetch(`https://data.usajobs.gov/api/Search?${params}`, {
        signal: AbortSignal.timeout(NETWORK_TIMEOUT),
        headers: {
          'Authorization-Key': key,
          'User-Agent': email,
          'Host': 'data.usajobs.gov',
        },
      });
      if (!res.ok) {
        warn(`[USAJOBS] HTTP ${res.status} for "${queryText}"`);
        continue;
      }
      const data = await res.json();
      const items = data?.SearchResult?.SearchResultItems || [];

      for (const item of items) {
        const mp = item.MatchedObjectDescriptor;
        if (!mp) continue;
        const url = mp.ApplyURI?.[0] || mp.PositionURI || '';
        if (seen.has(url)) continue;
        seen.add(url);

        const salaryMin = mp.PositionRemuneration?.[0]?.MinimumRange;
        const salaryMax = mp.PositionRemuneration?.[0]?.MaximumRange;
        const salaryStr = salaryMin && salaryMax ? `$${salaryMin}-$${salaryMax}` : '';
        const locStr = (mp.PositionLocation || []).map(l => l.LocationName).join(', ');

        allJobs.push({
          title: mp.PositionTitle || '',
          company: mp.OrganizationName || mp.DepartmentName || 'US Government',
          summary: stripHtml(mp.QualificationSummary || mp.UserArea?.Details?.MajorDuties || '').slice(0, 5000),
          apply_url: url,
          source: 'USAJOBS',
          date_posted: mp.PublicationStartDate || '',
          location: locStr,
          salary: salaryStr,
          location_tags: extractLocationTags(`${mp.PositionTitle} ${locStr}`),
        });
      }
      log(`[USAJOBS] "${queryText}" → ${items.length} jobs`);
    } catch (e) {
      logError(`[USAJOBS] "${queryText}" failed:`, e.message);
    }
  }

  log(`[USAJOBS] Done: ${allJobs.length} total jobs`);
  return allJobs;
}

// ---- Fetch WeWorkRemotely (RSS, free, no auth) ----
const WWR_FEEDS = [
  'https://weworkremotely.com/categories/remote-programming-jobs.rss',
  'https://weworkremotely.com/categories/remote-design-jobs.rss',
  'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
  'https://weworkremotely.com/categories/remote-customer-support-jobs.rss',
  'https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss',
  'https://weworkremotely.com/categories/remote-product-jobs.rss',
];

async function fetchWeWorkRemotely() {
  try {
    const results = await Promise.allSettled(
      WWR_FEEDS.map(url => fetchRSS(url, 'WeWorkRemotely', 20))
    );
    const allJobs = [];
    const seen = new Set();
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      for (const job of r.value) {
        const key = `${job.title}__${job.company}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        allJobs.push(job);
      }
    }
    log(`[WWR] Done: ${allJobs.length} total jobs`);
    return allJobs;
  } catch (e) {
    logError('[WWR] Failed:', e.message);
    return [];
  }
}

// ---- Fetch Instahyre (14.6K+ India curated jobs, clean REST API, no auth) ----
async function fetchInstahyre(queries, location) {
  try {
    const params = new URLSearchParams({
      company_size: '0',
      job_type: '0',
      offset: '0',
      source: 'opportunities',
    });
    // Instahyre doesn't support text search via query param — uses job_categories IDs
    // We'll fetch the default curated feed (sorted by relevance) which is what the site shows

    const res = await fetch(`https://www.instahyre.com/api/v1/job_search?${params}`, {
      signal: AbortSignal.timeout(NETWORK_TIMEOUT),
      headers: { 'User-Agent': 'Midas/1.0', 'Accept': 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json();

    const jobs = (data.objects || []).map(j => ({
      title: j.title || j.candidate_title || '',
      company: j.employer?.company_name || 'Unknown',
      summary: `${j.title} at ${j.employer?.company_name || 'Unknown'}. Skills: ${(j.keywords || []).join(', ')}`,
      apply_url: j.public_url || '',
      source: 'Instahyre',
      date_posted: '',
      location: Array.isArray(j.locations) ? j.locations.join(', ') : (j.locations || ''),
      location_tags: extractLocationTags(Array.isArray(j.locations) ? j.locations.join(' ') : (j.locations || '')),
    }));

    log(`[INSTAHYRE] Done: ${jobs.length} jobs (${data.meta?.total_count || '?'} total available)`);
    return jobs;
  } catch (e) {
    logError('[INSTAHYRE] Failed:', e.message);
    return [];
  }
}

// ---- Fetch Cutshort (30K+ India startup jobs, SSR HTML parse, no auth) ----
const CUTSHORT_CATEGORIES = [
  'backend-developer-jobs-in-bangalore-bengaluru',
  'frontend-developer-jobs-in-bangalore-bengaluru',
  'fullstack-developer-jobs-in-bangalore-bengaluru',
  'data-scientist-jobs-in-bangalore-bengaluru',
  'product-manager-jobs-in-bangalore-bengaluru',
  'devops-engineer-jobs-in-bangalore-bengaluru',
  'mobile-developer-jobs-in-bangalore-bengaluru',
  'python-jobs',
  'reactjs-jobs',
  'nodejs-jobs',
];

async function fetchCutshort(queries, location) {
  try {
    // Build category slug from query + location if available
    let slugs = [];
    if (queries?.length > 0) {
      const q = (typeof queries[0] === 'string' ? queries[0] : (queries[0].q || queries[0])).toLowerCase();
      const slug = q.replace(/\s+/g, '-');
      if (location) {
        const city = location.split(',')[0].trim().toLowerCase().replace(/\s+/g, '-');
        slugs.push(`${slug}-jobs-in-${city}`);
      }
      slugs.push(`${slug}-jobs`);
    } else {
      slugs = CUTSHORT_CATEGORIES.slice(0, 3);
    }

    const allJobs = [];
    const seen = new Set();

    for (const slug of slugs.slice(0, 2)) { // Max 2 category pages
      try {
        const res = await fetch(`https://cutshort.io/jobs/${slug}`, {
          signal: AbortSignal.timeout(NETWORK_TIMEOUT),
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        if (!res.ok) continue;
        const html = await res.text();
        const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
        if (!match) continue;
        const data = JSON.parse(match[1]);
        const jobs = data.props?.pageProps?.dehydratedState?.queries?.[0]?.state?.data?.data?.pageData?.jobs || [];

        for (const j of jobs) {
          const key = `${j.headline}__${j.companyDetails?.name}`.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          allJobs.push({
            title: j.headline || '',
            company: j.companyDetails?.name || 'Unknown',
            summary: stripHtml(j.sanitizedComment || '').slice(0, 5000) || `${j.headline}. Skills: ${(j.allSkills || []).map(s => s.name || s).join(', ')}`,
            apply_url: j.publicUrl ? `https://cutshort.io${j.publicUrl}` : (j.authApplyUrl || ''),
            source: 'Cutshort',
            date_posted: '',
            location: j.locationsText || (j.locations || []).join(', '),
            location_tags: extractLocationTags(j.locationsText || ''),
            salary_min: j.salaryRange?.min,
            salary_max: j.salaryRange?.max,
          });
        }
      } catch (e) {
        warn(`[CUTSHORT] Category ${slug} failed: ${e.message}`);
      }
    }

    log(`[CUTSHORT] Done: ${allJobs.length} jobs`);
    return allJobs;
  } catch (e) {
    logError('[CUTSHORT] Failed:', e.message);
    return [];
  }
}

// ---- Fetch HN Who Is Hiring (300-800 high-quality jobs/month, public HN API, no auth) ----
async function fetchHNWhoIsHiring() {
  try {
    // Get the 'whoishiring' user's latest submissions
    const userRes = await fetch('https://hacker-news.firebaseio.com/v0/user/whoishiring.json', {
      signal: AbortSignal.timeout(NETWORK_TIMEOUT),
    });
    if (!userRes.ok) return [];
    const user = await userRes.json();

    // Find the latest "Who is hiring?" thread (first submitted ID is most recent)
    let hiringThreadId = null;
    for (const id of (user.submitted || []).slice(0, 6)) {
      const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!itemRes.ok) continue;
      const item = await itemRes.json();
      if (item.title && item.title.includes('Who is hiring')) {
        hiringThreadId = id;
        break;
      }
    }
    if (!hiringThreadId) {
      warn('[HN_HIRING] Could not find Who is Hiring thread');
      return [];
    }

    // Fetch the thread to get comment IDs
    const threadRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${hiringThreadId}.json`, {
      signal: AbortSignal.timeout(NETWORK_TIMEOUT),
    });
    if (!threadRes.ok) return [];
    const thread = await threadRes.json();
    const commentIds = (thread.kids || []).slice(0, 60); // Top 60 comments (most recent/upvoted)

    // Fetch comments in parallel (batches of 15)
    const allJobs = [];
    for (let i = 0; i < commentIds.length; i += 15) {
      const batch = commentIds.slice(i, i + 15);
      const comments = await Promise.allSettled(
        batch.map(id => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
          signal: AbortSignal.timeout(8000),
        }).then(r => r.json()))
      );

      for (const result of comments) {
        if (result.status !== 'fulfilled' || !result.value?.text) continue;
        const c = result.value;
        const text = c.text.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

        // Parse: first line typically has "Company | Role | Location | Remote | URL"
        const firstLine = text.split(/[.\n]/)[0];
        const parts = firstLine.split('|').map(s => s.trim());

        if (parts.length < 2) continue; // Skip non-job comments

        const company = parts[0] || 'Unknown';
        const title = parts[1] || firstLine.substring(0, 80);
        const location = parts.find(p => /remote|onsite|hybrid|sf|nyc|london|berlin|bangalore|india/i.test(p)) || '';
        const urlMatch = text.match(/https?:\/\/[^\s<"]+/);

        allJobs.push({
          title: title.substring(0, 120),
          company: company.substring(0, 80),
          summary: text.substring(0, 5000),
          apply_url: urlMatch?.[0] || `https://news.ycombinator.com/item?id=${c.id}`,
          source: 'HN Hiring',
          date_posted: new Date(c.time * 1000).toISOString(),
          location: location,
          location_tags: extractLocationTags(text.substring(0, 500)),
        });
      }
    }

    log(`[HN_HIRING] Done: ${allJobs.length} jobs from "${thread.title}"`);
    return allJobs;
  } catch (e) {
    logError('[HN_HIRING] Failed:', e.message);
    return [];
  }
}

// ---- Fetch Apna.co (55K+ India jobs, Next.js _next/data endpoint, no auth) ----
async function fetchApna(queries, location) {
  try {
    // Build search URL with query + city filter
    const params = new URLSearchParams();
    if (queries?.length > 0) {
      const q = typeof queries[0] === 'string' ? queries[0] : (queries[0].q || queries[0]);
      params.set('query', q);
    }
    if (location) {
      // Extract city name for Apna's filter
      const city = location.split(',')[0].trim();
      params.set('city', city);
    }

    // First fetch to get the buildId
    const indexRes = await fetch('https://apna.co/jobs/', {
      signal: AbortSignal.timeout(NETWORK_TIMEOUT),
      headers: { 'User-Agent': 'Midas/1.0' },
    });
    if (!indexRes.ok) return [];
    const html = await indexRes.text();
    const ndMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (!ndMatch) return [];
    const nextData = JSON.parse(ndMatch[1]);
    const buildId = nextData.buildId;
    if (!buildId) return [];

    // Fetch filtered results via _next/data
    const dataUrl = `https://apna.co/_next/data/${buildId}/jobs.json?${params.toString()}`;
    const dataRes = await fetch(dataUrl, {
      signal: AbortSignal.timeout(NETWORK_TIMEOUT),
      headers: { 'User-Agent': 'Midas/1.0' },
    });
    if (!dataRes.ok) return [];
    const dataJson = await dataRes.json();
    const jobList = (dataJson.pageProps?.jobs || []).filter(j => j.type === 3).map(j => j.data);

    const jobs = jobList.map(j => ({
      title: j.title || '',
      company: j.organization?.name || 'Unknown',
      summary: stripHtml(j.description || '').slice(0, 5000),
      apply_url: j.public_url || j.external_job_url || '',
      source: 'Apna',
      date_posted: j.created_on || '',
      location: j.location_name || (j.address?.area || ''),
      location_tags: extractLocationTags(`${j.title} ${j.location_name || ''} ${j.address?.city?.name || ''}`),
      salary_min: j.min_salary,
      salary_max: j.max_salary,
    }));

    log(`[APNA] Done: ${jobs.length} jobs (${dataJson.pageProps?.totalJobCount || '?'} total available)`);
    return jobs;
  } catch (e) {
    logError('[APNA] Failed:', e.message);
    return [];
  }
}

// ---- Fetch Weekday.works (320K+ jobs, encrypted API, no auth required) ----
// Uses /jds/fetchJds — the public endpoint. Encrypts request with AES, decrypts response.
// CryptoJS-compatible AES: OpenSSL EVP_BytesToKey with Salted__ prefix, CBC mode, PKCS7 padding.

const WEEKDAY_ENCRYPT_KEY = '99je848e92v0904k';
const WEEKDAY_DECRYPT_KEY = '390fnwr03n03ehn3';

function evpBytesToKey(password, salt) {
  const passBytes = Buffer.from(password, 'utf8');
  let d = Buffer.alloc(0);
  let dI = Buffer.alloc(0);
  while (d.length < 48) { // 32 key + 16 iv
    dI = createHash('md5').update(Buffer.concat([dI, passBytes, salt])).digest();
    d = Buffer.concat([d, dI]);
  }
  return { key: d.subarray(0, 32), iv: d.subarray(32, 48) };
}

function weekdayEncrypt(obj) {
  const salt = randomBytes(8);
  const { key, iv } = evpBytesToKey(WEEKDAY_ENCRYPT_KEY, salt);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  return Buffer.concat([Buffer.from('Salted__'), salt, encrypted]).toString('base64');
}

function weekdayDecrypt(b64) {
  const raw = b64.replace(/^"|"$/g, '');
  const buf = Buffer.from(raw, 'base64');
  const salt = buf.subarray(8, 16);
  const ct = buf.subarray(16);
  const { key, iv } = evpBytesToKey(WEEKDAY_DECRYPT_KEY, salt);
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(ct), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

async function fetchWeekday(queries, location) {
  try {
    // Map location to Weekday's format
    const filters = {};
    if (location) {
      // Weekday uses city/country names in a locations array
      filters.locations = [location.split(',')[0].trim()]; // e.g. "Bangalore" from "Bangalore, India"
    }

    // Map first query to roles filter if available
    if (queries?.length > 0) {
      const roleQuery = typeof queries[0] === 'string' ? queries[0] : (queries[0].q || queries[0]);
      filters.roles = [roleQuery];
    }

    const payload = {
      filters,
      offset: 0,
      pageSize: 50, // grab a solid batch
      sortType: 'relevance',
    };

    const encrypted = weekdayEncrypt(payload);

    const res = await fetch('https://prod4.weekday.technology/jds/fetchJds', {
      method: 'POST',
      signal: AbortSignal.timeout(NETWORK_TIMEOUT),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: encrypted }),
    });

    if (!res.ok) {
      warn(`[WEEKDAY] API returned ${res.status}`);
      return [];
    }

    const text = await res.text();
    const data = weekdayDecrypt(text);

    const jobs = (data.list || []).map(j => ({
      title: j.jobRole || '',
      company: j.companyName || 'Unknown',
      summary: stripHtml(j.jobDetailsFromCompany || '').slice(0, 5000),
      apply_url: j.jdLink || j.directJobLink || '',
      source: 'Weekday',
      date_posted: j.addedOn || '',
      location: Array.isArray(j.location) ? j.location.join(', ') : (j.location || ''),
      location_tags: extractLocationTags(Array.isArray(j.location) ? j.location.join(' ') : (j.location || '')),
      salary_min: j.minJdSalary,
      salary_max: j.maxJdSalary,
      salary_currency: j.salaryCurrencyCode,
    }));

    log(`[WEEKDAY] Done: ${jobs.length} jobs (${data.count} total available)`);
    return jobs;
  } catch (e) {
    logError('[WEEKDAY] Failed:', e.message);
    return [];
  }
}

// ---- Fetch LinkedIn Job Search API (Fantastic.jobs via RapidAPI) ----
async function fetchLinkedInJobSearch(queries, location, apiKey) {
  const key = apiKey || process.env.JSEARCH_KEY; // same RapidAPI key
  if (!key) {
    log('[LINKEDIN_SEARCH] SKIPPED: No RapidAPI key');
    return [];
  }

  const allJobs = [];
  const seen = new Set();

  for (const q of (queries || []).slice(0, 3)) {
    const queryText = typeof q === 'string' ? q : (q.q || q);
    try {
      const params = new URLSearchParams({
        title_filter: queryText,
        description_type: 'text',
        limit: '25',
      });
      if (location) params.set('location_filter', location);

      const res = await fetch(`https://linkedin-job-search-api.p.rapidapi.com/active-jb-7d?${params}`, {
        signal: AbortSignal.timeout(NETWORK_TIMEOUT),
        headers: {
          'X-RapidAPI-Key': key,
          'X-RapidAPI-Host': 'linkedin-job-search-api.p.rapidapi.com',
        },
      });
      if (!res.ok) {
        warn(`[LINKEDIN_SEARCH] HTTP ${res.status} for "${queryText}"`);
        continue;
      }
      const data = await res.json();

      for (const j of (data || [])) {
        const url = j.url || '';
        if (!url || seen.has(url)) continue;
        seen.add(url);

        // Build salary string from raw or AI fields
        let salary = '';
        if (j.salary_raw?.value) {
          const sr = j.salary_raw;
          salary = sr.minValue && sr.maxValue
            ? `${sr.currency || ''} ${sr.minValue}-${sr.maxValue}/${sr.unitText || 'YEAR'}`
            : `${sr.currency || ''} ${sr.value || ''}/${sr.unitText || 'YEAR'}`;
        }

        const locStr = (j.locations_derived || []).map(l =>
          [l.city, l.admin, l.country].filter(Boolean).join(', ')
        ).join(' | ') || '';

        allJobs.push({
          title: j.title || '',
          company: j.organization || 'Unknown',
          summary: (j.description_text || '').slice(0, 5000),
          apply_url: j.url || '',
          source: 'LinkedIn (Fantastic)',
          date_posted: j.date_posted || '',
          location: locStr,
          salary,
          location_tags: extractLocationTags(`${j.title} ${locStr}`),
          remote: j.remote_derived || false,
          seniority: j.seniority || '',
          company_industry: j.linkedin_org_industry || '',
          company_size: j.linkedin_org_size || '',
        });
      }
      log(`[LINKEDIN_SEARCH] "${queryText}" → ${(data || []).length} jobs`);
    } catch (e) {
      logError(`[LINKEDIN_SEARCH] "${queryText}" failed:`, e.message);
    }
  }

  log(`[LINKEDIN_SEARCH] Done: ${allJobs.length} total jobs`);
  return allJobs;
}

// ---- Fetch Active Jobs DB (Fantastic.jobs ATS jobs via RapidAPI) ----
async function fetchActiveJobsDB(queries, location, apiKey) {
  const key = apiKey || process.env.JSEARCH_KEY;
  if (!key) {
    log('[ACTIVEJOBS] SKIPPED: No RapidAPI key');
    return [];
  }

  const allJobs = [];
  const seen = new Set();

  for (const q of (queries || []).slice(0, 3)) {
    const queryText = typeof q === 'string' ? q : (q.q || q);
    try {
      const params = new URLSearchParams({
        title_filter: queryText,
        description_type: 'text',
        limit: '25',
      });
      if (location) params.set('location_filter', location);

      const res = await fetch(`https://active-jobs-db.p.rapidapi.com/active-ats-7d?${params}`, {
        signal: AbortSignal.timeout(NETWORK_TIMEOUT),
        headers: {
          'X-RapidAPI-Key': key,
          'X-RapidAPI-Host': 'active-jobs-db.p.rapidapi.com',
        },
      });
      if (!res.ok) {
        warn(`[ACTIVEJOBS] HTTP ${res.status} for "${queryText}"`);
        continue;
      }
      const data = await res.json();

      for (const j of (data || [])) {
        const url = j.url || j.apply_url || '';
        if (!url || seen.has(url)) continue;
        seen.add(url);

        const locStr = (j.locations_derived || []).map(l =>
          [l.city, l.admin, l.country].filter(Boolean).join(', ')
        ).join(' | ') || j.location || '';

        allJobs.push({
          title: j.title || '',
          company: j.organization || j.company || 'Unknown',
          summary: (j.description_text || j.description || '').slice(0, 5000),
          apply_url: url,
          source: 'ActiveJobsDB',
          date_posted: j.date_posted || '',
          location: locStr,
          location_tags: extractLocationTags(`${j.title} ${locStr}`),
        });
      }
      log(`[ACTIVEJOBS] "${queryText}" → ${(data || []).length} jobs`);
    } catch (e) {
      logError(`[ACTIVEJOBS] "${queryText}" failed:`, e.message);
    }
  }

  log(`[ACTIVEJOBS] Done: ${allJobs.length} total jobs`);
  return allJobs;
}

// ---- Fetch Jobs API — Indeed (RapidAPI, Pat92) ----
async function fetchIndeedViaJobsAPI(queries, location, countryCode, apiKey) {
  const key = apiKey || process.env.JSEARCH_KEY;
  if (!key) {
    log('[INDEED_API] SKIPPED: No RapidAPI key');
    return [];
  }

  const allJobs = [];
  const seen = new Set();
  const cc = (countryCode || 'us').toLowerCase();

  for (const q of (queries || []).slice(0, 3)) {
    const queryText = typeof q === 'string' ? q : (q.q || q);
    try {
      const params = new URLSearchParams({
        query: queryText,
        countryCode: cc,
      });
      if (location) params.set('location', location);

      const res = await fetch(`https://jobs-api14.p.rapidapi.com/v2/indeed/search?${params}`, {
        signal: AbortSignal.timeout(NETWORK_TIMEOUT),
        headers: {
          'X-RapidAPI-Key': key,
          'X-RapidAPI-Host': 'jobs-api14.p.rapidapi.com',
        },
      });
      if (!res.ok) {
        warn(`[INDEED_API] HTTP ${res.status} for "${queryText}"`);
        continue;
      }
      const data = await res.json();
      if (data.hasError) {
        warn(`[INDEED_API] Error for "${queryText}": ${(data.errors || []).map(e => e.message).join(', ')}`);
        continue;
      }

      for (const j of (data.data || [])) {
        const url = j.applyUrl || '';
        if (!url || seen.has(url)) continue;
        // Skip aggregator links
        try {
          const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
          if (AGGREGATOR_DOMAINS.has(hostname)) continue;
        } catch { /* keep job if URL parse fails */ }
        seen.add(url);

        const locStr = j.location?.location || '';
        allJobs.push({
          title: j.title || '',
          company: j.company?.name || 'Unknown',
          summary: (j.description || '').slice(0, 5000),
          apply_url: url,
          source: 'Indeed',
          date_posted: '',
          location: locStr,
          location_tags: extractLocationTags(`${j.title} ${locStr}`),
        });
      }
      log(`[INDEED_API] "${queryText}" → ${(data.data || []).length} jobs`);
    } catch (e) {
      logError(`[INDEED_API] "${queryText}" failed:`, e.message);
    }
  }

  log(`[INDEED_API] Done: ${allJobs.length} total jobs`);
  return allJobs;
}

// ---- Fetch Jobs API — Bing Jobs (RapidAPI, Pat92) ----
async function fetchBingJobs(queries, location, apiKey) {
  const key = apiKey || process.env.JSEARCH_KEY;
  if (!key) {
    log('[BING_JOBS] SKIPPED: No RapidAPI key');
    return [];
  }

  const allJobs = [];
  const seen = new Set();

  for (const q of (queries || []).slice(0, 3)) {
    const queryText = typeof q === 'string' ? q : (q.q || q);
    try {
      const params = new URLSearchParams({
        query: queryText,
      });
      if (location) params.set('location', location);

      const res = await fetch(`https://jobs-api14.p.rapidapi.com/v2/bing/search?${params}`, {
        signal: AbortSignal.timeout(NETWORK_TIMEOUT),
        headers: {
          'X-RapidAPI-Key': key,
          'X-RapidAPI-Host': 'jobs-api14.p.rapidapi.com',
        },
      });
      if (!res.ok) {
        warn(`[BING_JOBS] HTTP ${res.status} for "${queryText}"`);
        continue;
      }
      const data = await res.json();
      if (data.hasError) {
        warn(`[BING_JOBS] Error for "${queryText}": ${(data.errors || []).map(e => e.message).join(', ')}`);
        continue;
      }

      for (const j of (data.data || [])) {
        const title = j.title || '';
        const company = j.company || 'Unknown';
        const key_ = `${title}__${company}`.toLowerCase();
        if (seen.has(key_)) continue;
        seen.add(key_);

        allJobs.push({
          title,
          company,
          summary: '',
          apply_url: '',  // Bing search only returns ID, need /get for applyUrl
          source: 'Bing Jobs',
          date_posted: j.postedTimeAgo || '',
          location: j.location || '',
          _bing_id: j.id,  // store for potential detail fetch
          location_tags: extractLocationTags(`${title} ${j.location || ''}`),
        });
      }
      log(`[BING_JOBS] "${queryText}" → ${(data.data || []).length} jobs`);
    } catch (e) {
      logError(`[BING_JOBS] "${queryText}" failed:`, e.message);
    }
  }

  log(`[BING_JOBS] Done: ${allJobs.length} total jobs`);
  return allJobs;
}

// ---- Fetch Apify All Jobs Scraper (Indeed + LinkedIn + Glassdoor + ZipRecruiter) ----
async function fetchApifyAllJobs(queries, location, apiKey) {
  const key = apiKey || process.env.APIFY_API_KEY;
  if (!key) {
    log('[APIFY_JOBS] SKIPPED: No APIFY_API_KEY');
    return [];
  }

  const queryText = (queries || []).slice(0, 1).map(q => typeof q === 'string' ? q : (q.q || q)).join(' ');
  if (!queryText) return [];

  try {
    const input = {
      keyword: queryText,
      country: location || 'United States',
      max_results: 30,
      currency: 'INR',
    };

    const runRes = await fetch('https://api.apify.com/v2/acts/jpraRc4MCUh5ehbHV/run-sync-get-dataset-items?token=' + key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(25000), // Must fit within Vercel's 30s limit
    });

    if (!runRes.ok) {
      warn(`[APIFY_JOBS] HTTP ${runRes.status}`);
      return [];
    }

    const data = await runRes.json();
    const allJobs = [];
    const seen = new Set();

    for (const j of (data || [])) {
      const url = j.applyUrl || j.url || j.jobUrl || '';
      if (!url || seen.has(url)) continue;
      // Skip aggregators
      try {
        const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
        if (AGGREGATOR_DOMAINS.has(hostname)) continue;
      } catch { /* keep */ }
      seen.add(url);

      allJobs.push({
        title: j.title || j.jobTitle || '',
        company: j.company || j.companyName || 'Unknown',
        summary: (j.description || j.jobDescription || '').slice(0, 5000),
        apply_url: url,
        source: j.source || 'Apify',
        date_posted: j.datePosted || j.postedDate || '',
        location: j.location || j.jobLocation || '',
        salary: j.salary || j.salaryRange || '',
        location_tags: extractLocationTags(`${j.title || ''} ${j.location || ''}`),
      });
    }

    log(`[APIFY_JOBS] Done: ${allJobs.length} jobs from ${data?.length || 0} results`);
    return allJobs;
  } catch (e) {
    logError('[APIFY_JOBS] Failed:', e.message);
    return [];
  }
}

// ---- Fetch Apify Naukri Scraper (India jobs) ----
async function fetchApifyNaukri(queries, apiKey) {
  const key = apiKey || process.env.APIFY_API_KEY;
  if (!key) {
    log('[APIFY_NAUKRI] SKIPPED: No APIFY_API_KEY');
    return [];
  }

  const queryText = (queries || []).slice(0, 1).map(q => typeof q === 'string' ? q : (q.q || q)).join(' ');
  if (!queryText) return [];

  try {
    const searchUrl = `https://www.naukri.com/${encodeURIComponent(queryText.replace(/\s+/g, '-'))}-jobs?k=${encodeURIComponent(queryText)}`;
    const input = {
      startUrls: [searchUrl],
      maxConcurrency: 5,
    };

    const runRes = await fetch('https://api.apify.com/v2/acts/EYXvM0o2lS7rYzgey/run-sync-get-dataset-items?token=' + key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(25000),
    });

    if (!runRes.ok) {
      warn(`[APIFY_NAUKRI] HTTP ${runRes.status}`);
      return [];
    }

    const data = await runRes.json();
    const allJobs = [];
    const seen = new Set();

    for (const j of (data || [])) {
      const url = j.url || j.applyUrl || j.jobUrl || '';
      if (!url || seen.has(url)) continue;
      seen.add(url);

      allJobs.push({
        title: j.title || j.jobTitle || '',
        company: j.company || j.companyName || 'Unknown',
        summary: (j.description || j.jobDescription || '').slice(0, 5000),
        apply_url: url,
        source: 'Naukri',
        date_posted: j.datePosted || j.postedDate || '',
        location: j.location || j.jobLocation || '',
        salary: j.salary || j.salaryRange || '',
        location_tags: extractLocationTags(`${j.title || ''} ${j.location || ''} India`),
      });
    }

    log(`[APIFY_NAUKRI] Done: ${allJobs.length} jobs`);
    return allJobs;
  } catch (e) {
    logError('[APIFY_NAUKRI] Failed:', e.message);
    return [];
  }
}

// ---- Fetch JobSpy microservice (Glassdoor, ZipRecruiter, Bayt) ----
// Requires: JOBSPY_API_URL env var pointing to a running rainmanjam/jobspy-api instance.
// Deploy: docker run -p 8000:8000 rainmanjam/jobspy-api  (Railway/Render ~$5/mo)
async function fetchJobSpy(queries, location) {
  const baseUrl = process.env.JOBSPY_API_URL;
  if (!baseUrl) {
    log('[JOBSPY] SKIPPED: No JOBSPY_API_URL');
    return [];
  }

  const queryText = (queries || []).slice(0, 2).map(q => typeof q === 'string' ? q : (q.q || q)).join(' OR ');
  if (!queryText) return [];

  try {
    const body = {
      site_name: ['glassdoor', 'zip_recruiter', 'bayt'],
      search_term: queryText,
      location: location || '',
      results_wanted: 30,
      hours_old: 168, // 7 days
      country_indeed: 'USA',
      ...(process.env.PROXY_URL ? { proxy: process.env.PROXY_URL } : {}),
    };

    const res = await fetch(`${baseUrl}/api/v1/search_jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(NETWORK_TIMEOUT),
    });

    if (!res.ok) {
      warn(`[JOBSPY] HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    const jobs = (data?.jobs || data || []).map(j => {
      const url = j.job_url || j.jobUrl || '';
      return {
        title: j.title || '',
        company: j.company || 'Unknown',
        summary: (j.description || '').slice(0, 5000),
        apply_url: url,
        source: j.site ? `JobSpy/${j.site.charAt(0).toUpperCase() + j.site.slice(1)}` : 'JobSpy',
        date_posted: j.date_posted || '',
        location: j.location || '',
        salary_min: j.min_amount || null,
        salary_max: j.max_amount || null,
        location_tags: extractLocationTags(`${j.title || ''} ${j.location || ''}`),
      };
    }).filter(j => j.apply_url);

    log(`[JOBSPY] Done: ${jobs.length} jobs (Glassdoor + ZipRecruiter + Bayt)`);
    return jobs;
  } catch (e) {
    logError('[JOBSPY] Failed:', e.message);
    return [];
  }
}

// ---- Fetch Wellfound via Apify actor (radeance/wellfound-job-listings-scraper) ----
async function fetchWellfound(queries, location) {
  const key = process.env.APIFY_API_KEY;
  if (!key) {
    log('[WELLFOUND] SKIPPED: No APIFY_API_KEY');
    return [];
  }

  const queryText = (queries || []).slice(0, 1).map(q => typeof q === 'string' ? q : (q.q || q)).join(' ');
  if (!queryText) return [];

  try {
    const input = {
      role: queryText,
      location: location || '',
      maxItems: 30,
    };

    const res = await fetch(
      `https://api.apify.com/v2/acts/radeance~wellfound-job-listings-scraper/run-sync-get-dataset-items?token=${key}&timeout=60`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(NETWORK_TIMEOUT),
      }
    );

    if (!res.ok) {
      warn(`[WELLFOUND] HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    const jobs = [];
    const seen = new Set();

    for (const j of (data || [])) {
      const url = j.jobUrl || j.url || j.apply_url || '';
      if (!url || seen.has(url)) continue;
      seen.add(url);

      jobs.push({
        title: j.title || j.jobTitle || '',
        company: j.company || j.companyName || 'Unknown',
        summary: (j.description || j.jobDescription || '').slice(0, 5000),
        apply_url: url,
        source: 'Wellfound',
        date_posted: j.datePosted || j.postedAt || '',
        location: j.location || j.jobLocation || '',
        salary_min: j.salaryMin || j.minSalary || null,
        salary_max: j.salaryMax || j.maxSalary || null,
        location_tags: extractLocationTags(`${j.title || ''} ${j.location || ''}`),
      });
    }

    log(`[WELLFOUND] Done: ${jobs.length} jobs`);
    return jobs;
  } catch (e) {
    logError('[WELLFOUND] Failed:', e.message);
    return [];
  }
}

// ---- Fetch Foundit.in via Apify actor (easyapi/foundit-jobs-scraper) ----
async function fetchFoundit(queries, location) {
  const key = process.env.APIFY_API_KEY;
  if (!key) {
    log('[FOUNDIT] SKIPPED: No APIFY_API_KEY');
    return [];
  }

  const queryText = (queries || []).slice(0, 1).map(q => typeof q === 'string' ? q : (q.q || q)).join(' ');
  if (!queryText) return [];

  try {
    const input = {
      keyword: queryText,
      location: location || '',
      maxResults: 30,
    };

    const res = await fetch(
      `https://api.apify.com/v2/acts/easyapi~foundit-jobs-scraper/run-sync-get-dataset-items?token=${key}&timeout=60`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(NETWORK_TIMEOUT),
      }
    );

    if (!res.ok) {
      warn(`[FOUNDIT] HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    const jobs = [];
    const seen = new Set();

    for (const j of (data || [])) {
      const url = j.jobUrl || j.url || j.applyUrl || '';
      if (!url || seen.has(url)) continue;
      seen.add(url);

      jobs.push({
        title: j.title || j.jobTitle || '',
        company: j.company || j.companyName || 'Unknown',
        summary: (j.description || j.jobDescription || '').slice(0, 5000),
        apply_url: url,
        source: 'Foundit',
        date_posted: j.datePosted || j.postedDate || '',
        location: j.location || j.jobLocation || '',
        salary: j.salary || j.salaryRange || '',
        location_tags: extractLocationTags(`${j.title || ''} ${j.location || ''} India`),
      });
    }

    log(`[FOUNDIT] Done: ${jobs.length} jobs`);
    return jobs;
  } catch (e) {
    logError('[FOUNDIT] Failed:', e.message);
    return [];
  }
}

// ---- Fetch DevITjobs UK (free XML feed, no auth, UK tech jobs) ----
async function fetchDevITjobs() {
  try {
    const res = await fetch('https://devitjobs.uk/job_feed.xml', {
      signal: AbortSignal.timeout(NETWORK_TIMEOUT),
      headers: { 'User-Agent': 'Midas/1.0' },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = parseRSSItems(xml);

    const jobs = items.slice(0, 50).map(item => {
      const [company, title] = extractCompanyFromTitle(item.title);
      const summary = stripHtml(item.description).slice(0, 1000);
      return {
        title: title || item.title,
        company,
        summary,
        apply_url: item.link,
        source: 'DevITjobs',
        date_posted: item.pubDate || '',
        location: 'UK',
        location_tags: extractLocationTags(`${title} ${summary} UK`),
      };
    });
    log(`[DEVITJOBS] Done: ${jobs.length} jobs`);
    return jobs;
  } catch (e) {
    logError('[DEVITJOBS] Failed:', e.message);
    return [];
  }
}

// ---- Fetch Jooble API (free key, 70+ countries) ----
async function fetchJooble(queries, location, apiKey) {
  const key = apiKey || process.env.JOOBLE_API_KEY;
  if (!key) {
    log('[JOOBLE] SKIPPED: No JOOBLE_API_KEY configured');
    return [];
  }

  const allJobs = [];
  const seen = new Set();

  for (const q of (queries || []).slice(0, 3)) {
    const queryText = typeof q === 'string' ? q : (q.q || q);
    try {
      const res = await fetch(`https://jooble.org/api/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: queryText,
          location: location || '',
          page: 1,
        }),
        signal: AbortSignal.timeout(NETWORK_TIMEOUT),
      });
      if (!res.ok) {
        warn(`[JOOBLE] HTTP ${res.status} for "${queryText}"`);
        continue;
      }
      const data = await res.json();

      for (const j of (data.jobs || []).slice(0, 25)) {
        const url = j.link || '';
        if (!url || seen.has(url)) continue;

        // Skip aggregator links
        try {
          const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
          if (AGGREGATOR_DOMAINS.has(hostname)) continue;
        } catch { continue; }

        seen.add(url);
        allJobs.push({
          title: j.title || '',
          company: j.company || 'Unknown',
          summary: stripHtml(j.snippet || '').slice(0, 5000),
          apply_url: url,
          source: 'Jooble',
          date_posted: j.updated || '',
          location: j.location || '',
          salary: j.salary || '',
          location_tags: extractLocationTags(`${j.title} ${j.location}`),
        });
      }
      log(`[JOOBLE] "${queryText}" → ${(data.jobs || []).length} results`);
    } catch (e) {
      logError(`[JOOBLE] "${queryText}" failed:`, e.message);
    }
  }

  log(`[JOOBLE] Done: ${allJobs.length} total jobs`);
  return allJobs;
}

// ---- Fetch Reed.co.uk API (free key, UK jobs) ----
async function fetchReed(queries, apiKey) {
  const key = apiKey || process.env.REED_API_KEY;
  if (!key) {
    log('[REED] SKIPPED: No REED_API_KEY configured');
    return [];
  }

  const allJobs = [];
  const seen = new Set();

  for (const q of (queries || []).slice(0, 3)) {
    const queryText = typeof q === 'string' ? q : (q.q || q);
    try {
      const params = new URLSearchParams({ keywords: queryText, resultsToTake: '25' });
      const res = await fetch(`https://www.reed.co.uk/api/1.0/search?${params}`, {
        signal: AbortSignal.timeout(NETWORK_TIMEOUT),
        headers: {
          'Authorization': 'Basic ' + Buffer.from(key + ':').toString('base64'),
        },
      });
      if (!res.ok) {
        warn(`[REED] HTTP ${res.status} for "${queryText}"`);
        continue;
      }
      const data = await res.json();

      for (const j of (data.results || []).slice(0, 25)) {
        const url = j.jobUrl || '';
        if (!url || seen.has(url)) continue;
        seen.add(url);

        const salaryStr = j.minimumSalary && j.maximumSalary
          ? `£${j.minimumSalary.toLocaleString()}-£${j.maximumSalary.toLocaleString()}`
          : '';

        allJobs.push({
          title: j.jobTitle || '',
          company: j.employerName || 'Unknown',
          summary: stripHtml(j.jobDescription || '').slice(0, 5000),
          apply_url: url,
          source: 'Reed',
          date_posted: j.date || '',
          location: j.locationName || '',
          salary: salaryStr,
          location_tags: extractLocationTags(`${j.jobTitle} ${j.locationName}`),
        });
      }
      log(`[REED] "${queryText}" → ${(data.results || []).length} results`);
    } catch (e) {
      logError(`[REED] "${queryText}" failed:`, e.message);
    }
  }

  log(`[REED] Done: ${allJobs.length} total jobs`);
  return allJobs;
}

// ---- Fetch Himalayas API (free, no key required) ----
async function fetchHimalayas() {
  try {
    const res = await fetch('https://himalayas.app/jobs/api?limit=50', {
      signal: AbortSignal.timeout(NETWORK_TIMEOUT),
      headers: { 'User-Agent': 'Midas/1.0' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs || []).slice(0, 50).map(j => ({
      title: j.title || '',
      company: j.companyName || j.company_name || 'Unknown',
      summary: stripHtml(j.description || j.excerpt || '').slice(0, 5000),
      apply_url: j.applicationLink || j.url || '',
      source: 'Himalayas',
      date_posted: j.pubDate || j.postedAt || '',
      location: (j.locationRestrictions || []).join(', ') || 'Remote',
      location_tags: extractLocationTags(`${j.title} ${j.description || ''} ${(j.locationRestrictions || []).join(' ')}`),
    }));
  } catch (e) {
    logError('Himalayas failed:', e.message);
    return [];
  }
}

// ---- Fetch Jobicy JSON API (free, no key required — upgraded from RSS) ----
async function fetchJobicy() {
  try {
    const res = await fetch('https://jobicy.com/api/v2/remote-jobs?count=50', {
      signal: AbortSignal.timeout(NETWORK_TIMEOUT),
      headers: { 'User-Agent': 'Midas/1.0' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs || []).map(j => ({
      title: j.jobTitle || '',
      company: j.companyName || 'Unknown',
      summary: stripHtml(j.jobDescription || j.jobExcerpt || '').slice(0, 5000),
      apply_url: j.url || '',
      source: 'Jobicy',
      date_posted: j.pubDate || '',
      location: j.jobGeo || 'Remote',
      location_tags: extractLocationTags(`${j.jobTitle} ${j.jobDescription || ''} ${j.jobGeo || ''}`),
    }));
  } catch (e) {
    logError('Jobicy failed:', e.message);
    return [];
  }
}

// ---- Fetch Findwork.dev API (free with API key) ----
async function fetchFindwork(apiKey) {
  const key = apiKey || process.env.FINDWORK_API_KEY;
  if (!key) {
    log('[FINDWORK] SKIPPED: No FINDWORK_API_KEY configured');
    return [];
  }
  try {
    const res = await fetch('https://findwork.dev/api/jobs/', {
      signal: AbortSignal.timeout(NETWORK_TIMEOUT),
      headers: {
        'Authorization': `Token ${key}`,
        'User-Agent': 'Midas/1.0',
      },
    });
    if (!res.ok) {
      warn(`[FINDWORK] HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    return (data.results || []).map(j => ({
      title: j.role || '',
      company: j.company_name || 'Unknown',
      summary: stripHtml(j.text || '').slice(0, 5000),
      apply_url: j.url || '',
      source: 'Findwork',
      date_posted: j.date_posted || '',
      location: j.location || (j.remote ? 'Remote' : ''),
      location_tags: extractLocationTags(`${j.role} ${j.text || ''} ${j.location || ''}`),
    }));
  } catch (e) {
    logError('Findwork failed:', e.message);
    return [];
  }
}

// ---- Adzuna country code whitelist ----
const ADZUNA_COUNTRIES = new Set([
  'us', 'gb', 'au', 'in', 'de', 'fr', 'br', 'ca', 'nl', 'nz', 'pl', 'sg', 'za', 'at', 'it'
]);

// ---- Fetch Adzuna API ----
async function fetchAdzuna(queries, location, countryCode, appId, appKey) {
  if (!appId || !appKey || !queries.length) {
    if (!appId || !appKey) log('[ADZUNA] SKIPPED: ADZUNA_APP_ID/KEY not configured');
    return [];
  }

  const country = ADZUNA_COUNTRIES.has((countryCode || '').toLowerCase())
    ? countryCode.toLowerCase()
    : 'us';

  const allJobs = [];
  const seen = new Set();

  for (const q of queries.slice(0, 4)) {
    const queryText = typeof q === 'string' ? q : (q.q || q);

    // Check cache first
    const cacheKey = `adzuna_${country}_${encodeURIComponent(queryText.toLowerCase())}_${encodeURIComponent((location || 'any').toLowerCase())}`;
    const cached = await getCachedJobs(cacheKey);
    if (cached) {
      log(`[ADZUNA] Cache HIT: "${queryText}" → ${cached.length} jobs`);
      for (const job of cached) {
        const key = `${job.title}__${job.company}`.toLowerCase();
        if (!seen.has(key)) { seen.add(key); allJobs.push(job); }
      }
      continue;
    }

    try {
      const params = new URLSearchParams({
        app_id: appId,
        app_key: appKey,
        what: queryText,
        results_per_page: '20',
        'content-type': 'application/json',
        max_days_old: '30',
      });
      if (location) params.set('where', location);

      const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`;
      log(`[ADZUNA] Fetching: "${queryText}" | ${country} | ${location || 'any'}`);

      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) {
        logError(`[ADZUNA] HTTP ${res.status} for "${queryText}"`);
        continue;
      }

      const data = await res.json();
      const queryJobs = [];

      for (const r of (data.results || [])) {
        const key = `${r.title}__${r.company?.display_name}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const formatted = {
          title: r.title || '',
          company: r.company?.display_name || 'Unknown',
          summary: stripHtml(r.description || '').slice(0, 5000),
          apply_url: r.redirect_url || '',
          source: 'Adzuna',
          location: r.location?.display_name || '',
          date_posted: r.created || '',
          location_tags: extractLocationTags(
            `${r.title} ${r.description} ${r.location?.display_name} ${(r.location?.area || []).join(' ')}`
          ),
        };
        queryJobs.push(formatted);
        allJobs.push(formatted);
      }

      if (queryJobs.length > 0) {
        await cacheJobs(cacheKey, queryJobs, 21600); // 6h cache
      }

      log(`[ADZUNA] "${queryText}" → ${queryJobs.length} jobs`);
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      logError(`[ADZUNA] Query "${queryText}" failed:`, e.message);
    }
  }

  log(`[ADZUNA] Done: ${allJobs.length} total jobs`);
  return allJobs;
}

// ---- DataForSEO Google Ads location codes (city → code) ----
// These are Google Ads geo targeting IDs. DataForSEO requires either an exact location_name
// match (very strict) or a numeric location_code. Each code below has been verified live
// against the DataForSEO task_post endpoint. Invalid codes removed: Gurgaon (1007770),
// Sydney (1000339), Dublin (1007267), Indore (1007781).
const DATAFORSEO_CITY_CODES = {
  // India (verified)
  'bengaluru': 1007768, 'bangalore': 1007768,
  'mumbai': 1007777, 'bombay': 1007777,
  'delhi': 1007785, 'new delhi': 1007785,
  'hyderabad': 9061745,
  'chennai': 9061747, 'madras': 9061747,
  'kolkata': 1007773, 'calcutta': 1007773,
  'pune': 9062006,
  'ahmedabad': 9061889,
  'noida': 1007761,
  'kochi': 1007790, 'cochin': 1007790,
  'jaipur': 1007787,
  'lucknow': 1007780,
  'chandigarh': 1007783,
  'coimbatore': 9062130,
  // US (verified)
  'new york': 1023191, 'nyc': 1023191,
  'san francisco': 1014221,
  'seattle': 1027744,
  'boston': 1018127,
  'austin': 1026339,
  'los angeles': 1013962,
  'chicago': 1016367,
  'denver': 1014869,
  'atlanta': 1015254,
  // UK (verified)
  'london': 1006886,
  'manchester': 1006894,
  'edinburgh': 1006844,
  // Other major (verified)
  'singapore': 9062542,
  'dubai': 9061957, 'uae': 9061957,
  'toronto': 1002057,
  'berlin': 1003854,
  'amsterdam': 1010543,
  'paris': 1006094,
  'tokyo': 1009288,
};

// Country fallback codes (Google Ads country geo targeting IDs, verified)
// Removed: Australia 2036 (invalid), Ireland 2372 (invalid)
const DATAFORSEO_COUNTRY_CODES = {
  'in': 2356, 'india': 2356,
  'us': 2840, 'united states': 2840, 'usa': 2840,
  'gb': 2826, 'uk': 2826, 'united kingdom': 2826,
  'ca': 2124, 'canada': 2124,
  'de': 2276, 'germany': 2276,
  'fr': 2250, 'france': 2250,
  'sg': 2702, 'singapore': 2702,
  'ae': 2784, 'uae': 2784,
  'nl': 2528, 'netherlands': 2528,
  'jp': 2392, 'japan': 2392,
};

/**
 * Resolve a location string to a DataForSEO location_code.
 * Tries city map first, then country code, then defaults to India.
 */
function resolveDataForSEOLocationCode(location, userCountry) {
  // 1. Try city match — extract first segment, normalize, lookup
  if (location) {
    const cityCandidate = location.split(',')[0].trim().toLowerCase();
    if (DATAFORSEO_CITY_CODES[cityCandidate]) {
      return { code: DATAFORSEO_CITY_CODES[cityCandidate], source: `city:${cityCandidate}` };
    }
    // Also try the second segment in case format is "Country, State, City"
    const segments = location.split(',').map(s => s.trim().toLowerCase());
    for (const seg of segments) {
      if (DATAFORSEO_CITY_CODES[seg]) {
        return { code: DATAFORSEO_CITY_CODES[seg], source: `city:${seg}` };
      }
    }
  }
  // 2. Try country code from user's country pref
  if (userCountry) {
    const code = DATAFORSEO_COUNTRY_CODES[userCountry.toLowerCase()];
    if (code) return { code, source: `country:${userCountry}` };
  }
  // 3. Fallback: India (we're an India-focused product)
  return { code: 2356, source: 'fallback:india' };
}

// ---- Fetch DataForSEO Google Jobs (real Google Jobs structured data) ----
// Uses Standard async flow: POST task → poll task_get until ready.
// Google Jobs does NOT have a Live mode endpoint at DataForSEO (only task_post/task_get).
// Cost: ~$0.0006/task at standard priority, $0.0012 at high priority.
// $50 deposit covers ~80K standard tasks. Polling adds 5-30s latency per task.
async function fetchDataForSEO(queries, location, preferences) {
  // Auth: prefer pre-encoded base64 (DATAFORSEO_AUTH), fall back to login+password
  let authHeader = process.env.DATAFORSEO_AUTH;
  if (!authHeader) {
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;
    if (login && password) {
      authHeader = Buffer.from(`${login}:${password}`).toString('base64');
    }
  }
  if (!authHeader) {
    warn('[DATAFORSEO] SKIPPED: No DATAFORSEO_AUTH (or LOGIN+PASSWORD) configured');
    return [];
  }
  if (!queries.length) {
    warn('[DATAFORSEO] SKIPPED: No queries');
    return [];
  }

  // Resolve location to a numeric Google Ads location_code
  const userCountry = preferences?.country || '';
  const { code: locationCode, source: locationSource } = resolveDataForSEOLocationCode(location, userCountry);
  warn(`[DATAFORSEO] Using location_code=${locationCode} (${locationSource})`);

  // Build task array — one task per query, max 5 to control cost (~$0.006 per scan at high priority)
  const tasks = queries.slice(0, 5).map(q => {
    const queryText = typeof q === 'string' ? q : (q.q || q);
    return {
      keyword: queryText,
      location_code: locationCode,
      language_code: 'en',
      depth: 20,
      priority: 2,  // High priority queue — faster completion (~5-10s vs 30s+ for standard)
    };
  }).filter(t => t.keyword);

  if (tasks.length === 0) return [];

  // ── Step 1: POST tasks ────────────────────────────────────
  let taskIds = [];
  try {
    const postRes = await fetch('https://api.dataforseo.com/v3/serp/google/jobs/task_post', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tasks),
      signal: AbortSignal.timeout(15000),
    });

    if (!postRes.ok) {
      warn(`[DATAFORSEO] task_post HTTP ${postRes.status}`);
      return [];
    }

    const postData = await postRes.json();
    if (postData.status_code !== 20000) {
      warn(`[DATAFORSEO] task_post error ${postData.status_code}: ${postData.status_message}`);
      return [];
    }

    taskIds = (postData.tasks || []).map(t => ({
      id: t.id,
      keyword: t.data?.keyword || '',
      cost: t.cost || 0,
      status: t.status_code,
    })).filter(t => t.id && t.status === 20100);  // 20100 = task created

    log(`[DATAFORSEO] Posted ${taskIds.length} tasks (initial cost: $${taskIds.reduce((s, t) => s + t.cost, 0).toFixed(4)})`);
    if (taskIds.length === 0) return [];
  } catch (e) {
    logError('[DATAFORSEO] task_post failed:', e.message);
    return [];
  }

  // ── Step 2: Poll task_get for each task until ready ───────
  const allJobs = [];
  const seen = new Set();
  const POLL_INTERVAL_MS = 2000;
  const MAX_POLL_ATTEMPTS = 15;  // 15 * 2s = 30s max per task

  // Poll all tasks in parallel
  await Promise.all(taskIds.map(async (task) => {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      try {
        const getRes = await fetch(`https://api.dataforseo.com/v3/serp/google/jobs/task_get/advanced/${task.id}`, {
          method: 'GET',
          headers: { 'Authorization': `Basic ${authHeader}` },
          signal: AbortSignal.timeout(10000),
        });

        if (!getRes.ok) {
          warn(`[DATAFORSEO] task_get HTTP ${getRes.status} for "${task.keyword}"`);
          break;
        }

        const getData = await getRes.json();
        const taskData = getData.tasks?.[0];
        if (!taskData) break;

        // 20000 = ready, 40602 = task in queue, 40601 = task in progress
        if (taskData.status_code === 40602 || taskData.status_code === 40601) {
          await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
          continue;
        }

        if (taskData.status_code !== 20000) {
          warn(`[DATAFORSEO] task ${task.id} error ${taskData.status_code}: ${taskData.status_message}`);
          break;
        }

        // Parse results — items have type 'google_jobs_item' with the documented field names
        for (const result of (taskData.result || [])) {
          for (const item of (result.items || [])) {
            if (item.type !== 'google_jobs_item') continue;

            const company = item.employer_name || 'Unknown';
            const title = item.title || '';
            if (!title) continue;

            const dedupKey = `${company.toLowerCase()}::${title.toLowerCase()}`;
            if (seen.has(dedupKey)) continue;
            seen.add(dedupKey);

            // Build summary from available fields since DataForSEO doesn't return JD bodies.
            // Pack location, contract type, source, and time-ago into the summary so the
            // scoring engine has SOMETHING to work with for keyword matching beyond just title.
            const summaryParts = [];
            if (item.location) summaryParts.push(item.location);
            if (item.contract_type) summaryParts.push(item.contract_type);
            if (item.source_name) summaryParts.push(`Posted ${item.source_name}`);
            if (item.time_ago) summaryParts.push(item.time_ago);
            if (item.salary) summaryParts.push(`Salary: ${item.salary}`);

            allJobs.push({
              title,
              company,
              location: item.location || '',
              summary: summaryParts.join(' • '),
              apply_url: item.source_url || item.employer_url || '',
              source: 'Google Jobs',
              date_posted: item.timestamp || '',
              salary: item.salary || '',
              location_tags: extractLocationTags(item.location || ''),
            });
          }
        }

        log(`[DATAFORSEO] "${task.keyword}" → ready after ${attempt + 1} polls`);
        return;
      } catch (e) {
        warn(`[DATAFORSEO] poll error for "${task.keyword}": ${e.message}`);
        break;
      }
    }
    warn(`[DATAFORSEO] "${task.keyword}" did not complete within ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`);
  }));

  log(`[DATAFORSEO] Done: ${allJobs.length} jobs from ${taskIds.length} queries`);
  return allJobs;
}

// ---- Fetch Serper.dev (Google Jobs via google.serper.dev) ----
async function fetchSerper(queries, location, apiKey) {
  const key = apiKey || process.env.SERPER_API_KEY;
  if (!key) {
    log('[SERPER] SKIPPED: No SERPER_API_KEY configured');
    return [];
  }
  if (!queries.length) {
    log('[SERPER] SKIPPED: No queries');
    return [];
  }

  const allJobs = [];
  const seen = new Set();

  for (const q of queries.slice(0, 5)) {
    const queryText = typeof q === 'string' ? q : (q.q || q);
    try {
      const body = {
        q: queryText + (location ? ` ${location}` : ''),
        num: 20,
      };

      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        warn(`[SERPER] HTTP ${res.status} for "${queryText}"`);
        continue;
      }

      const data = await res.json();
      const organic = data.organic || [];

      for (const item of organic) {
        const link = item.link;
        if (!link || seen.has(link)) continue;
        seen.add(link);

        let company = '';
        let title = item.title || '';

        const atMatch = title.match(/^(.+?)\s+at\s+(.+?)(?:\s*[|\-–]|$)/i);
        const dashMatch = title.match(/^(.+?)\s*[|\-–]\s*(.+?)(?:\s*[|\-–]|$)/);
        if (atMatch) {
          title = atMatch[1].trim();
          company = atMatch[2].trim();
        } else if (dashMatch) {
          title = dashMatch[1].trim();
          company = dashMatch[2].trim();
        }

        // Skip aggregator domains
        let hostname;
        try { hostname = new URL(link).hostname.replace(/^www\./, '').toLowerCase(); } catch { continue; }
        if (AGGREGATOR_DOMAINS.has(hostname)) continue;

        // Skip job board search result pages — these are NOT individual job listings.
        // Catches: "1100+ Customer Experience Jobs in Bengaluru", "67,210 Lead customer experience jobs",
        // "767 Customer Operations Job Vacancies", "Customer Experience Manager Jobs In Bangalore",
        // "Customer Success Specialist Jobs In Bengaluru", "salaries in Bengaluru"
        const JOB_BOARD_DOMAINS = new Set([
          'linkedin.com', 'in.linkedin.com', 'indeed.com', 'in.indeed.com',
          'glassdoor.com', 'glassdoor.co.in', 'ambitionbox.com', 'naukri.com',
          'wellfound.com', 'monster.com', 'foundit.in', 'shine.com',
          'ziprecruiter.com', 'simplyhired.com',
        ]);
        const isJobBoard = JOB_BOARD_DOMAINS.has(hostname)
          || hostname.endsWith('.linkedin.com') || hostname.endsWith('.indeed.com')
          || hostname.endsWith('.glassdoor.com') || hostname.endsWith('.glassdoor.co.in')
          || hostname.endsWith('.naukri.com');
        if (isJobBoard) continue;  // Always skip job board links — we already query these sources directly

        // Skip search/listing/directory pages (not individual job postings)
        const fullTitle = (item.title || '').toLowerCase();
        const isSearchPage = /\d[\d,]+\+?\s*\w/.test(item.title || '')  // "1100+" or "67,210" at start of a word
          || /\bjobs?\s+in\b/i.test(fullTitle)
          || /\bvacancies\b/i.test(fullTitle)
          || /\bjobs?\s+(available|near|around)\b/i.test(fullTitle)
          || /\bsalaries?\s+in\b/i.test(fullTitle)
          || /\bopen\s+jobs\b/i.test(fullTitle)
          || /^(find|search|browse|explore)\b/i.test(fullTitle)
          // Company/agency directory pages — not jobs at all
          || /\b(companies|company|startups|agencies|firms|services|providers|consultancies|consultants|partners)\s+in\b/i.test(fullTitle)
          || /^(best|top|leading|popular)\s+\d*\s*\w/i.test(fullTitle)
          || /\b(directory|listings?|catalog|guide)\b/i.test(fullTitle)
          || /\bin\s+\d{4}\b/.test(fullTitle);  // "in 2026" — listicles

        if (isSearchPage) continue;

        // Strong positive filter: title must contain at least ONE actual job role keyword.
        // If a title doesn't mention any role word, it's almost certainly NOT a job posting.
        const JOB_ROLE_KEYWORDS = [
          'engineer', 'developer', 'programmer', 'architect', 'coder',
          'manager', 'lead', 'director', 'head', 'chief', 'vp', 'principal', 'staff',
          'analyst', 'specialist', 'coordinator', 'associate', 'representative',
          'designer', 'researcher', 'consultant', 'advisor', 'strategist',
          'officer', 'executive', 'agent', 'administrator', 'admin',
          'intern', 'trainee', 'apprentice', 'fresher', 'graduate',
          'scientist', 'technician', 'operator', 'planner', 'auditor',
          'recruiter', 'sourcer', 'controller', 'accountant', 'bookkeeper',
          'writer', 'editor', 'copywriter', 'producer', 'creator',
          'salesperson', 'seller', 'buyer', 'merchandiser',
          'nurse', 'doctor', 'physician', 'therapist', 'paramedic',
          'teacher', 'tutor', 'instructor', 'professor', 'mentor',
          'driver', 'pilot', 'chef', 'cook', 'barista', 'server',
          'electrician', 'plumber', 'carpenter', 'mechanic', 'welder',
          'guard', 'janitor', 'cleaner', 'cashier', 'clerk',
          // Compound role indicators
          'csm', 'tam', 'sde', 'swe', 'pm ', 'em ', 'tpm', 'bdr', 'sdr',
          // Specific role patterns
          'success', 'support', 'experience', 'service', 'operations', 'ops',
        ];
        const hasJobRoleWord = JOB_ROLE_KEYWORDS.some(kw => fullTitle.includes(kw));
        if (!hasJobRoleWord) continue;

        allJobs.push({
          title: title,
          company: company || hostname,
          location: '',
          summary: item.snippet || '',
          apply_url: link,
          source: 'Serper',
          date_posted: '',
        });
      }

      log(`[SERPER] "${queryText}" → ${organic.length} results, ${allJobs.length} jobs total`);
    } catch (e) {
      logError(`[SERPER] "${queryText}" failed:`, e.message);
    }
  }

  log(`[SERPER] Done: ${allJobs.length} total jobs`);
  return allJobs;
}

// ---- Fetch JSearch (RapidAPI) ----
async function fetchJSearch(queries, location, apiKey) {
  // Prefer direct OpenWebNinja API (X_API_KEY) over RapidAPI to avoid rate limits
  const directKey = process.env.X_API_KEY;
  if (!directKey && !apiKey) return [];
  if (!queries.length) return [];
  const allJobs = [];

  for (const q of queries.slice(0, 6)) {
    try {
      const params = new URLSearchParams({
        query: location ? `${q} in ${location}` : q,
        num_pages: '1',
      });

      let url, opts;
      if (directKey) {
        url = `https://api.openwebninja.com/v1/jsearch/search?${params}`;
        opts = { headers: { 'X-API-Key': directKey } };
      } else {
        url = `https://jsearch-mega.p.rapidapi.com/search?${params}`;
        opts = { headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': 'jsearch-mega.p.rapidapi.com' } };
      }

      // Try with 25s timeout, retry once on timeout with 30s
      let res;
      try {
        res = await fetch(url, { ...opts, signal: AbortSignal.timeout(25000) });
      } catch (firstErr) {
        if (firstErr.name === 'TimeoutError' || firstErr.name === 'AbortError') {
          warn(`[JSEARCH] Timeout on "${q}", retrying...`);
          res = await fetch(url, { ...opts, signal: AbortSignal.timeout(30000) });
        } else {
          throw firstErr;
        }
      }

      if (!res.ok) {
        warn(`[JSEARCH] "${q}" returned HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();

      for (const job of (data.data || [])) {
        // Filter out aggregator apply links from JSearch too
        let applyUrl = job.job_apply_link || '';
        if (applyUrl) {
          try {
            const host = new URL(applyUrl).hostname.replace(/^www\./, '').toLowerCase();
            if (_isAggregator(host)) {
              // Swap to a direct career page search
              applyUrl = _buildFallbackUrl(job.employer_name || '', job.job_title || '', null, null);
            }
          } catch { /* keep original */ }
        }

        allJobs.push({
          title: job.job_title || '',
          company: job.employer_name || 'Unknown',
          summary: stripHtml(job.job_description || '').slice(0, 5000),
          apply_url: applyUrl,
          source: job.job_publisher || 'JSearch',
          location: [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', '),
          date_posted: job.job_posted_at_datetime_utc || '',
          location_tags: extractLocationTags(`${job.job_title} ${job.job_description} ${job.job_city} ${job.job_country}`),
        });
      }
      log(`[JSEARCH] "${q}" → ${(data.data || []).length} jobs`);

      await new Promise(r => setTimeout(r, 1200));
    } catch (e) {
      logError(`[JSEARCH] "${q}" failed:`, e.message);
    }
  }
  // Source breakdown for debugging
  const jsearchSources = {};
  for (const j of allJobs) jsearchSources[j.source] = (jsearchSources[j.source] || 0) + 1;
  log(`[JSEARCH] Total: ${allJobs.length} jobs from ${queries.slice(0, 6).length} queries | Sources:`, JSON.stringify(jsearchSources));
  return allJobs;
}


// ---- Fetch LinkedIn Jobs (Fantastic.Jobs via RapidAPI) ----
async function fetchLinkedIn(queries, location, apiKey) {
  if (!apiKey || !queries.length) {
    if (!apiKey) log('[LINKEDIN] SKIPPED: No RapidAPI key for LinkedIn');
    return [];
  }

  const allJobs = [];
  const seen = new Set();

  // Use top 4 queries as title searches (API recommends titleSearch as primary filter)
  for (const q of queries.slice(0, 4)) {
    const queryText = typeof q === 'string' ? q : (q.q || q);

    // Cache check
    const cacheKey = `linkedin_${encodeURIComponent(queryText.toLowerCase())}_${encodeURIComponent((location || 'any').toLowerCase())}`;
    const cached = await getCachedJobs(cacheKey);
    if (cached) {
      log(`[LINKEDIN] Cache HIT: "${queryText}" → ${cached.length} jobs`);
      for (const job of cached) {
        const key = `${job.title}__${job.company}`.toLowerCase();
        if (!seen.has(key)) { seen.add(key); allJobs.push(job); }
      }
      continue;
    }

    try {
      // Fantastic.Jobs LinkedIn Job Search API on RapidAPI
      // Primary filter: titleSearch (recommended by API docs as most reliable)
      const params = new URLSearchParams({ titleSearch: queryText });
      if (location) params.set('locationSearch', location);

      const url = `https://linkedin-job-search-api.p.rapidapi.com/search-jobs?${params}`;
      log(`[LINKEDIN] Fetching: "${queryText}" | ${location || 'global'}`);

      let res;
      try {
        res = await fetch(url, {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'linkedin-job-search-api.p.rapidapi.com',
          },
          signal: AbortSignal.timeout(20000),
        });
      } catch (firstErr) {
        if (firstErr.name === 'TimeoutError' || firstErr.name === 'AbortError') {
          warn(`[LINKEDIN] Timeout on "${queryText}", retrying...`);
          res = await fetch(url, {
            headers: {
              'X-RapidAPI-Key': apiKey,
              'X-RapidAPI-Host': 'linkedin-job-search-api.p.rapidapi.com',
            },
            signal: AbortSignal.timeout(30000),
          });
        } else { throw firstErr; }
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        if (res.status === 403 && errText.includes('not subscribed')) {
          warn(`[LINKEDIN] Not subscribed to LinkedIn API — subscribe at rapidapi.com. Skipping all queries.`);
          return allJobs; // Exit early, don't spam remaining queries
        }
        if (res.status === 429) {
          warn(`[LINKEDIN] Rate limited — waiting and skipping remaining queries`);
          return allJobs; // Exit early on rate limit
        }
        logError(`[LINKEDIN] HTTP ${res.status} for "${queryText}":`, errText.slice(0, 500));

        // 403 = not subscribed — no point retrying remaining queries
        if (res.status === 403) {
          warn('[LINKEDIN] API subscription inactive (403). Skipping remaining queries. Subscribe at RapidAPI to enable LinkedIn results.');
          break;
        }

        // 429 = rate limited — back off and retry once
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get('retry-after') || '5', 10);
          warn(`[LINKEDIN] Rate limited (429). Waiting ${retryAfter}s before retry...`);
          await new Promise(r => setTimeout(r, retryAfter * 1000));
          // Retry this query once
          try {
            const retryRes = await fetch(url, {
              headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': 'linkedin-job-search-api.p.rapidapi.com' },
              signal: AbortSignal.timeout(20000),
            });
            if (retryRes.ok) {
              res = retryRes;
            } else {
              logError(`[LINKEDIN] Retry also failed (${retryRes.status}). Skipping "${queryText}".`);
              continue;
            }
          } catch { continue; }
        } else {
          continue;
        }
      }

      const data = await res.json();

      // Log raw response shape for debugging (first call only)
      if (allJobs.length === 0) {
        const keys = Object.keys(data || {});
        log(`[LINKEDIN] Response shape: {${keys.join(', ')}} | isArray: ${Array.isArray(data)}`);
      }

      // Flexible parsing — handle multiple possible response shapes
      const jobs = Array.isArray(data) ? data
        : (data.data || data.jobs || data.results || data.items || []);

      const queryJobs = [];
      for (const job of jobs) {
        // Flexible field mapping for Fantastic.Jobs response
        const title = job.title || job.jobTitle || '';
        const company = job.organization?.name || job.company?.name || job.companyName || job.company || 'Unknown';
        const desc = job.description || job.jobDescription || '';
        const loc = job.location || job.jobLocation || '';
        const applyUrl = job.url || job.jobUrl || job.applyUrl || job.applicationUrl || '';
        const datePosted = job.datePosted || job.listedAt || job.postedAt || job.createdAt || '';

        const key = `${title}__${company}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const formatted = {
          title,
          company: typeof company === 'string' ? company : 'Unknown',
          summary: stripHtml(desc).slice(0, 5000),
          apply_url: applyUrl,
          source: 'LinkedIn',
          location: loc,
          date_posted: datePosted,
          location_tags: extractLocationTags(`${title} ${desc} ${loc}`),
        };
        queryJobs.push(formatted);
        allJobs.push(formatted);
      }

      // Cache results
      if (queryJobs.length > 0) {
        await cacheJobs(cacheKey, queryJobs, 21600); // 6h cache
      }

      log(`[LINKEDIN] "${queryText}" → ${queryJobs.length} jobs`);
      await new Promise(r => setTimeout(r, 1000)); // Rate limit
    } catch (e) {
      logError(`[LINKEDIN] "${queryText}" failed:`, e.message);
    }
  }

  log(`[LINKEDIN] Total: ${allJobs.length} jobs from ${Math.min(queries.length, 4)} queries`);
  return allJobs;
}

/**
 * Uses OpenRouter (Gemini Flash) to generate pre-fused search queries.
 * Called once per resume scan. Adds ~0.5-1s but eliminates query noise entirely.
 *
 * @param {object} profile        — Full profile from resume-parser.js
 * @param {string} apiKey         — OPENROUTER_API_KEY
 * @returns {Promise<{roleAnchor: string, dominantPlatform: string, queries: string[]}>}
 */
/**
 * Instructor-pattern structured LLM output parser.
 * Handles markdown code fences, trailing commas, single quotes, and missing fields.
 * Throws with a clear message on failure so callers can fall back gracefully.
 */
function parseStructuredLLM(text, requiredFields = []) {
    let cleaned = (text || '').trim();

    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

    // Extract first JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object in LLM response');

    let parsed;
    try {
        parsed = JSON.parse(jsonMatch[0]);
    } catch {
        // Repair common LLM JSON mistakes: trailing commas, single-quoted keys/values
        const repaired = jsonMatch[0]
            .replace(/,(\s*[}\]])/g, '$1')   // trailing commas
            .replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3')  // single-quoted keys
            .replace(/:\s*'([^']*)'/g, ': "$1"');               // single-quoted values
        parsed = JSON.parse(repaired);
    }

    // Validate required fields
    for (const field of requiredFields) {
        if (parsed[field] === undefined || parsed[field] === null) {
            throw new Error(`LLM response missing required field: "${field}"`);
        }
    }

    return parsed;
}

async function planQueriesWithLLM(profile, apiKey) {
  const effectiveKey = apiKey || process.env.OPENROUTER_API_KEY;
  if (!effectiveKey) {
    warn('[QUERY_PLANNER] No OPENROUTER_API_KEY — falling back to rule-based buildQueries()');
    return null;
  }

  const skillSummary = [
    ...(profile.skills || []),
    ...(profile.search_terms || []),
  ].slice(0, 20).join(', ');

  // Integrate search strategy if available
  const strategy = profile.search_strategy || {};
  const queryAngles = (strategy.query_angles || []).join(', ');
  const niches = (strategy.industry_niches || []).join(', ');
  const companyTypes = (strategy.target_company_types || []).join(', ');
  const trajectory = strategy.career_trajectory || '';

  const prompt = `You are a job search query optimizer for Google Jobs.
Given this candidate profile, generate exactly 7 search queries in 2 tiers.

Google Jobs sweet spot: 3-4 word queries work best. 5+ words returns 0 results.

TIER 1 — CORE ROLE (4 queries): Direct title matches and SYNONYMS
- Query 1: Their exact job title (e.g. "Product Manager")
- Query 2: Alternative title/SYNONYM — use a genuinely DIFFERENT wording that recruiters use for the same role (e.g. "Customer Experience" ↔ "Customer Support" ↔ "Customer Success", "Software Engineer" ↔ "Software Developer", "Product Manager" ↔ "Product Owner")
- Query 3: Role + seniority level (e.g. "Senior Product Manager")
- Query 4: Another synonym or adjacent title (e.g. "Program Manager")

TIER 2 — INDUSTRY/DOMAIN (3 queries): Role in specific contexts
- Query 5: Role + industry vertical (e.g. "Fintech Product Manager")
- Query 6: Role + niche domain (e.g. "SaaS Implementation Lead")
- Query 7: Adjacent role they could transition to (e.g. "Solutions Architect")

CRITICAL: Synonyms must be TRULY DIFFERENT WORDS, not the same words rearranged.
- "Customer Experience" synonyms: Customer Support, Customer Success, Client Services, CX Manager
- "Software Engineer" synonyms: Developer, SDE, Programmer, Backend Engineer
- "Data Analyst" synonyms: Business Analyst, Analytics Engineer, BI Analyst

RULES:
- 3-4 words per query. NEVER exceed 4 words.
- Each query must be DISTINCT (different angles, not rephrased duplicates)
- At least 4 queries must include the core role title or a close synonym
- Return ONLY valid JSON, no markdown
${queryAngles ? `\nAlternative search angles to consider: ${queryAngles}` : ''}
${niches ? `\nIndustry niches: ${niches}` : ''}
${trajectory ? `\nCareer trajectory: ${trajectory}` : ''}

Candidate:
- Headline: ${profile.headline || 'Unknown'}
- Industry: ${profile.industry || 'Unknown'}
- Experience: ${profile.experience_years || 0} years
- Skills & terms: ${skillSummary}

Respond ONLY with this JSON shape:
{
  "roleAnchor": "...",
  "dominantPlatform": "...",
  "queries": ["q1", "q2", "q3", "q4", "q5", "q6", "q7"]
}`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${effectiveKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://midasmatch.com',
        'X-Title': 'Midas',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',   // fastest + cheapest on OpenRouter
        temperature: 0,
        max_tokens: 250,   // 7 queries need fewer tokens
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(10000),   // 10s for longer response
    });

    if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);

    const data = await res.json();
    const text = (data.choices?.[0]?.message?.content || '').trim();

    const parsed = parseStructuredLLM(text, ['queries']);

    if (!Array.isArray(parsed.queries) || parsed.queries.length === 0) {
      throw new Error('LLM returned empty queries array');
    }

    log(`[QUERY_PLANNER] LLM 12-query tiered plan:`, parsed);
    return parsed;

  } catch (e) {
    warn('[QUERY_PLANNER] LLM call failed, falling back to rule-based:', e.message);
    return null;   // triggers fallback in buildQueries()
  }
}

export async function buildQueries(profile, preferences = {}, apiKey = null) {
  const headline = (profile.headline || '').trim();
  const searchTerms = profile.search_terms || [];
  const industry = (profile.industry || '').trim();

  // Extract skills object natively supporting ecosystem collapse
  const normalized = normalizeSkillsForSearch(profile.skills || []);
  const allKeywords = profile.search_keywords && profile.search_keywords.length > 0
    ? profile.search_keywords
    : normalized.keywords;

  const searchKeywords = rankSkillsForSearch(allKeywords, 5);

  const preferredLocation = preferences.location || profile.country || '';
  const isRemote = preferences.remoteOnly || ['remote only', 'remote', 'global'].includes(preferredLocation.toLowerCase());

  let location = null;
  if (!isRemote && preferredLocation) {
    location = preferredLocation;
  }

  // ── Step 1: Try LLM-powered query planning ──────────────────────────────
  const llmPlan = await planQueriesWithLLM(profile, apiKey);

  if (llmPlan && llmPlan.queries.length > 0) {
    // Don't embed location in query text — SerpAPI has a dedicated &location= param
    const queries = llmPlan.queries;

    log('[QUERY_PLANNER] Using LLM-planned queries:', queries);
    return {
      queries: queries.slice(0, 7),
      location,
      roleAnchor: llmPlan.roleAnchor,
      dominantPlatform: llmPlan.dominantPlatform,
      expandedQueries: queries,
      isRemotePreferred: isRemote,
      source: 'llm',
    };
  }

  // ── Step 2: Fallback — original rule-based logic (my updated advanced ranker) ────────────
  log('[QUERY_PLANNER] Using advanced rule-based fallback');
  const queries = [];

  // Priority 1: Job title (headline)
  if (headline) queries.push(headline);

  // Priority 2: Industry + Headline compound (surfaces strategic roles)
  if (industry && headline) {
    queries.push(`${industry} ${headline}`);
  }

  // Priority 3: Top-5 ranked keyword queries
  for (const kw of searchKeywords) {
    if (headline) {
      queries.push(`${kw} ${headline}`);
    } else if (industry) {
      queries.push(`${kw} ${industry} jobs`);
    } else {
      queries.push(`${kw} jobs`);
    }
  }

  // Priority 4: Search terms (LLM-generated job title variations)
  for (const term of searchTerms.slice(0, 3)) queries.push(term);

  if (industry && queries.length < 8) queries.push(`${industry} jobs`);

  // Remote variant (location is handled via SerpAPI's &location= param, not in query text)
  if (headline && isRemote) queries.push(`${headline} remote`);

  // Deduplicate
  const seen = new Set();
  const unique = queries.filter(q => {
    const k = q.toLowerCase().trim();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Enforce max 8 words per query
  const trimmed = unique.map(q => {
    const words = q.split(/\s+/);
    return words.length > 8 ? words.slice(0, 8).join(' ') : q;
  });

  return {
    queries: trimmed.slice(0, 12),
    location,
    expandedQueries: trimmed,
    isRemotePreferred: isRemote,
    roleAnchor: headline || null,
    dominantPlatform: normalized.dominantPlatform || null,
    source: 'rules'
  };
}

// ---- Main fetch function ----
export async function fetchAllJobs(profile, apiKeys = {}, onProgress, preferences = {}) {
  // Try to use provided keys first, otherwise fallback to process.env (useful for running via node scripts vs Next.js)
  const jsearchKey = apiKeys.JSEARCH_KEY || process.env.JSEARCH_KEY;
  const linkedinKey = apiKeys.LINKEDIN_API_KEY || process.env.LINKEDIN_API_KEY || ''; // Only runs if explicitly configured
  const openRouterKey = apiKeys.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  const adzunaAppId = apiKeys.ADZUNA_APP_ID || process.env.ADZUNA_APP_ID;
  const adzunaAppKey = apiKeys.ADZUNA_APP_KEY || process.env.ADZUNA_APP_KEY;

  const { queries, location, isRemotePreferred, roleAnchor, dominantPlatform, source } = await buildQueries(profile, preferences, openRouterKey);
  log(`[QUERY_PLANNER] Query source: ${source} | roleAnchor: ${roleAnchor} | dominantPlatform: ${dominantPlatform}`);

  onProgress?.(isRemotePreferred ? 'Fetching remote-first jobs...' : `Fetching jobs near ${location}...`);

  let allJobs = [];

  // ONLY fetch remote RSS feeds if the user actually wants remote jobs.
  // We completely bypass them for local searches to prevent global spam.
  if (isRemotePreferred) {
    onProgress?.(`Fetching Remote RSS feeds...`);
    const [remoteOkResult, jobicyResult, remotiveResult, simplyHiredResult] = await Promise.all([
      fetchRSS(REMOTEOK_FEED, 'RemoteOK', 100),
      fetchRSS(JOBICY_FEED, 'Jobicy'),
      fetchRemotive(),
      fetchRSS(SIMPLYHIRED_FEED, 'SimplyHired', 50),
    ]);

    allJobs = [
      ...remoteOkResult,
      ...jobicyResult,
      ...remotiveResult,
      ...simplyHiredResult,
    ];
    onProgress?.(`RSS: ${allJobs.length} remote jobs found.`);
  }

  // All sources in parallel — Serper + Adzuna + JSearch + LinkedIn + free APIs + ATS
  const isMidasSearch = preferences.midasSearch === true;
  const findworkKey = apiKeys.FINDWORK_API_KEY || process.env.FINDWORK_API_KEY;
  const serperKey = apiKeys.SERPER_API_KEY || process.env.SERPER_API_KEY;
  const usajobsKey = apiKeys.USAJOBS_API_KEY || process.env.USAJOBS_API_KEY;
  const joobleKey = apiKeys.JOOBLE_API_KEY || process.env.JOOBLE_API_KEY;
  const reedKey = apiKeys.REED_API_KEY || process.env.REED_API_KEY;

  if (queries.length > 0) {
    log(`[INGESTION_ORCHESTRATOR] Free sources returned ${allJobs.length} jobs. Activating all sources.`);
    log('[INGESTION_ORCHESTRATOR] Midas Search:', isMidasSearch);

    const adzunaCountry = preferences.country || profile.country || 'US';
    const adzunaLocation = preferences.city || preferences.state || '';
    const queryCount = isMidasSearch ? Math.min(queries.length, 12) : Math.min(queries.length, 7);
    const activeQueries = queries.slice(0, queryCount);
    onProgress?.(`Querying ${activeQueries.length} queries across Serper + JSearch + LinkedIn + Adzuna + USAJOBS + Jooble + Reed + WWR + Himalayas + Jobicy + Findwork...`);

    const [serperJobs, adzunaJobs, jsearchJobs, linkedinJobs, arbeitnowJobs, museJobs, himalayasJobs, jobicyJobs, findworkJobs, usajobsJobs, wwrJobs, joobleJobs, reedJobs, devitJobs, linkedinSearchJobs, activeDbJobs, indeedJobs, bingJobs, apifyJobs, naukriJobs, weekdayJobs, apnaJobs, instahyreJobs, cutshortJobs, hnJobs] = await Promise.all([
      fetchSerper(activeQueries.slice(0, 5), location, serperKey),
      fetchAdzuna(activeQueries, adzunaLocation, adzunaCountry, adzunaAppId, adzunaAppKey),
      fetchJSearch(activeQueries.slice(0, isMidasSearch ? 10 : 6), location, jsearchKey),
      fetchLinkedIn(activeQueries.slice(0, 4), location, linkedinKey),
      fetchArbeitnow(),
      fetchTheMuse(activeQueries.slice(0, 2)),
      fetchHimalayas(),
      fetchJobicy(),
      fetchFindwork(findworkKey),
      fetchUSAJobs(activeQueries.slice(0, 3), usajobsKey),
      fetchWeWorkRemotely(),
      fetchJooble(activeQueries.slice(0, 3), location, joobleKey),
      fetchReed(activeQueries.slice(0, 3), reedKey),
      fetchDevITjobs(),
      fetchLinkedInJobSearch(activeQueries.slice(0, 3), location, jsearchKey),
      fetchActiveJobsDB(activeQueries.slice(0, 3), location, jsearchKey),
      fetchIndeedViaJobsAPI(activeQueries.slice(0, 3), location, adzunaCountry, jsearchKey),
      fetchBingJobs(activeQueries.slice(0, 3), location, jsearchKey),
      fetchApifyAllJobs(activeQueries, location),
      fetchApifyNaukri(activeQueries),
      fetchWeekday(activeQueries.slice(0, 1), location),
      fetchApna(activeQueries.slice(0, 1), location),
      fetchInstahyre(activeQueries, location),
      fetchCutshort(activeQueries, location),
      fetchHNWhoIsHiring(),
    ]);

    allJobs.push(...serperJobs, ...adzunaJobs, ...jsearchJobs, ...linkedinJobs, ...arbeitnowJobs, ...museJobs, ...himalayasJobs, ...jobicyJobs, ...findworkJobs, ...usajobsJobs, ...wwrJobs, ...joobleJobs, ...reedJobs, ...devitJobs, ...linkedinSearchJobs, ...activeDbJobs, ...indeedJobs, ...bingJobs, ...apifyJobs, ...naukriJobs, ...weekdayJobs, ...apnaJobs, ...instahyreJobs, ...cutshortJobs, ...hnJobs);
    onProgress?.(`+${serperJobs.length} Serper, +${adzunaJobs.length} Adzuna, +${jsearchJobs.length} JSearch, +${linkedinJobs.length} LinkedIn, +${arbeitnowJobs.length} Arbeitnow, +${museJobs.length} The Muse, +${himalayasJobs.length} Himalayas, +${jobicyJobs.length} Jobicy, +${findworkJobs.length} Findwork, +${usajobsJobs.length} USAJOBS, +${wwrJobs.length} WWR, +${joobleJobs.length} Jooble, +${reedJobs.length} Reed, +${devitJobs.length} DevITjobs, +${linkedinSearchJobs.length} LinkedIn(Fantastic), +${activeDbJobs.length} ActiveJobsDB, +${indeedJobs.length} Indeed, +${bingJobs.length} Bing, +${apifyJobs.length} Apify, +${naukriJobs.length} Naukri, +${weekdayJobs.length} Weekday, +${apnaJobs.length} Apna, +${instahyreJobs.length} Instahyre, +${cutshortJobs.length} Cutshort.`);

    // Auto-broaden: if location-specific search returned very few results
    const apiJobCount = adzunaJobs.length + jsearchJobs.length + linkedinJobs.length;
    if (location && apiJobCount < 3) {
      const broaderQueries = activeQueries.slice(0, 2);
      onProgress?.(`Very few results (${apiJobCount}) — broadening top queries without location...`);
      log(`[AUTO_BROADEN] ${apiJobCount} jobs with location, retrying ${broaderQueries.length} queries without location`);
      const [broaderAdzuna, broaderJsearch] = await Promise.all([
        fetchAdzuna(broaderQueries, '', adzunaCountry, adzunaAppId, adzunaAppKey),
        fetchJSearch(broaderQueries, null, jsearchKey),
      ]);
      allJobs.push(...broaderAdzuna, ...broaderJsearch);
      onProgress?.(`+${broaderAdzuna.length + broaderJsearch.length} from broader search.`);
    }

    // RSS FALLBACK: If APIs returned very few results, pull in free RSS feeds
    const totalApiJobs = apiJobCount + himalayasJobs.length + jobicyJobs.length + findworkJobs.length;
    if (!isRemotePreferred && totalApiJobs < 10) {
      onProgress?.(`APIs returned only ${totalApiJobs} jobs — adding free RSS feeds as fallback...`);
      log(`[RSS_FALLBACK] Sources returned ${totalApiJobs} jobs, activating RSS fallback`);
      const [remoteOkFallback, remotiveFallback] = await Promise.all([
        fetchRSS(REMOTEOK_FEED, 'RemoteOK', 50),
        fetchRemotive(),
      ]);
      const rssFallbackJobs = [...remoteOkFallback, ...remotiveFallback];
      allJobs.push(...rssFallbackJobs);
      onProgress?.(`+${rssFallbackJobs.length} from RSS fallback feeds.`);
    }

    if (isMidasSearch) {
      // Midas Search: expanded coverage via broader query set (already using 12 queries above)
      // Also fire RSS feeds as bonus sources for Midas
      onProgress?.('Midas Search: adding bonus RSS sources for deeper coverage...');
      const [midasRemoteOk, midasRemotive] = await Promise.all([
        fetchRSS(REMOTEOK_FEED, 'RemoteOK', 100),
        fetchRemotive(),
      ]);
      allJobs.push(...midasRemoteOk, ...midasRemotive);
      onProgress?.(`+${midasRemoteOk.length + midasRemotive.length} Midas Search bonus results.`);
    }
  } else {
    warn('[INGESTION_ORCHESTRATOR] SKIPPED: No queries generated');
  }

  // Pass 1: URL-based dedup
  const seenUrls = new Set();
  let unique = allJobs.filter(j => {
    const url = j.apply_url;
    if (!url) return true;
    if (seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });

  // Pass 2: Title+Company fuzzy dedup (catches cross-source duplicates)
  const seenTitleCompany = new Set();
  unique = unique.filter(j => {
    const key = `${(j.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')}__${(j.company || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    if (seenTitleCompany.has(key)) return false;
    seenTitleCompany.add(key);
    return true;
  });

  // Source breakdown
  const sources = {};
  for (const j of unique) {
    sources[j.source] = (sources[j.source] || 0) + 1;
  }

  onProgress?.(`Total: ${unique.length} unique jobs (deduped from ${allJobs.length} raw)`);
  log(`[FETCH_ALL] Source breakdown:`, JSON.stringify(sources));
  return { jobs: unique, sources, queries, roleAnchor, dominantPlatform, source };
}

/**
 * Streaming variant of fetchAllJobs.
 * Fires `onSourceComplete(sourceName, jobs)` as each source resolves,
 * enabling SSE streaming of partial results.
 * Returns the same shape as fetchAllJobs for final reconciliation.
 */
// Helper: wraps a source fetch with cache check + circuit breaker + streaming callback
async function sourceStream(name, fetchFn, onSourceComplete, allJobs, cacheKey) {
    const start = Date.now();

    // Check cache first (if key provided)
    if (cacheKey) {
        try {
            const cached = await getCachedJobs(cacheKey);
            if (cached && Array.isArray(cached) && cached.length > 0) {
                warn(`[SOURCE] ${name}: ${cached.length} jobs (CACHE HIT, ${Date.now() - start}ms)`);
                onSourceComplete(name, cached);
                allJobs.push(...cached);
                return cached;
            }
        } catch (err) {
            warn(`[SOURCE] ${name}: cache lookup failed — ${err.message}`);
        }
    }

    try {
        const jobs = await withCircuitBreaker(name, fetchFn);
        const ms = Date.now() - start;
        warn(`[SOURCE] ${name}: ${jobs.length} jobs (${ms}ms)`);
        onSourceComplete(name, jobs);
        allJobs.push(...jobs);
        // Cache results for 30 minutes
        if (cacheKey && jobs.length > 0) {
            cacheJobs(cacheKey, slimJobsForCache(jobs), 1800).catch(() => {});
        }
        return jobs;
    } catch (err) {
        const ms = Date.now() - start;
        const reason = err.message?.includes('aborted') ? 'TIMEOUT' :
                       err.message?.includes('circuit') ? 'CIRCUIT OPEN' : err.message;
        warn(`[SOURCE] ${name}: FAILED (${ms}ms) — ${reason}`);
        return [];
    }
}

// Build a cache key from source name + query params
function buildSourceCacheKey(source, queries, location) {
    const queryStr = (queries || []).slice(0, 5).sort().join('|').toLowerCase().replace(/\s+/g, '_');
    const locStr = (location || 'remote').toLowerCase().replace(/\s+/g, '_');
    return `src:${source}:${queryStr}:${locStr}`;
}

export async function fetchAllJobsStreaming(profile, apiKeys = {}, onSourceComplete, onProgress, preferences = {}) {
  const openRouterKey = apiKeys.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  const forceRefresh = preferences.forceRefresh === true;

  const { queries, location, isRemotePreferred, roleAnchor, dominantPlatform, source } = await buildQueries(profile, preferences, openRouterKey);
  warn(`[QUERY_PLANNER] source=${source} | roleAnchor=${roleAnchor} | platform=${dominantPlatform} | location=${location} | queries=${JSON.stringify(queries.slice(0, 7))}`);

  onProgress?.(isRemotePreferred ? 'Fetching remote-first jobs...' : `Fetching jobs near ${location}...`);

  let allJobs = [];
  const isMidasSearch = preferences.midasSearch === true;
  const queryCount = isMidasSearch ? Math.min(queries.length, 12) : Math.min(queries.length, 7);
  const activeQueries = queries.slice(0, queryCount);
  const adzunaCountry = preferences.country || profile.country || 'US';
  const adzunaLocation = preferences.city || preferences.state || '';

  // Resolve API keys (user-provided > env vars)
  const resolvedKeys = {
    JSEARCH_KEY: apiKeys.JSEARCH_KEY || process.env.JSEARCH_KEY,
    LINKEDIN_API_KEY: apiKeys.LINKEDIN_API_KEY || process.env.LINKEDIN_API_KEY || '',
    ADZUNA_APP_ID: apiKeys.ADZUNA_APP_ID || process.env.ADZUNA_APP_ID,
    ADZUNA_APP_KEY: apiKeys.ADZUNA_APP_KEY || process.env.ADZUNA_APP_KEY,
    FINDWORK_API_KEY: apiKeys.FINDWORK_API_KEY || process.env.FINDWORK_API_KEY,
    SERPER_API_KEY: apiKeys.SERPER_API_KEY || process.env.SERPER_API_KEY,
    USAJOBS_API_KEY: apiKeys.USAJOBS_API_KEY || process.env.USAJOBS_API_KEY,
    JOOBLE_API_KEY: apiKeys.JOOBLE_API_KEY || process.env.JOOBLE_API_KEY,
    REED_API_KEY: apiKeys.REED_API_KEY || process.env.REED_API_KEY,
    JOBSPY_API_URL: process.env.JOBSPY_API_URL || '',
  };

  // Build source context — injected into each registry source's makeFetcher
  const ctx = {
    queries, location, activeQueries, apiKeys, resolvedKeys, preferences, profile,
    isMidasSearch, adzunaCountry, adzunaLocation,
    _fetchRSS: fetchRSS, _fetchRemotive: fetchRemotive, _fetchArbeitnow: fetchArbeitnow,
    _fetchTheMuse: fetchTheMuse, _fetchUSAJobs: fetchUSAJobs, _fetchWeWorkRemotely: fetchWeWorkRemotely,
    _fetchInstahyre: fetchInstahyre, _fetchCutshort: fetchCutshort, _fetchHNWhoIsHiring: fetchHNWhoIsHiring,
    _fetchApna: fetchApna, _fetchWeekday: fetchWeekday, _fetchLinkedInJobSearch: fetchLinkedInJobSearch,
    _fetchActiveJobsDB: fetchActiveJobsDB, _fetchIndeedViaJobsAPI: fetchIndeedViaJobsAPI,
    _fetchBingJobs: fetchBingJobs, _fetchApifyAllJobs: fetchApifyAllJobs, _fetchApifyNaukri: fetchApifyNaukri,
    _fetchJobSpy: fetchJobSpy, _fetchWellfound: fetchWellfound, _fetchFoundit: fetchFoundit,
    _fetchDevITjobs: fetchDevITjobs, _fetchJooble: fetchJooble, _fetchReed: fetchReed,
    _fetchHimalayas: fetchHimalayas, _fetchJobicy: fetchJobicy, _fetchFindwork: fetchFindwork,
    _fetchSerper: fetchSerper, _fetchJSearch: fetchJSearch, _fetchLinkedIn: fetchLinkedIn,
    _fetchAdzuna: fetchAdzuna, _fetchATSJobs: fetchATSJobs,
    _fetchDataForSEO: fetchDataForSEO,
    _REMOTEOK_FEED: REMOTEOK_FEED, _JOBICY_FEED: JOBICY_FEED, _SIMPLYHIRED_FEED: SIMPLYHIRED_FEED,
  };

  // ---- Phase 1: RSS feeds (registry-driven, only if remote preferred) ----
  const userCountry = preferences.country || profile.country || '';
  const { rss: rssSources, api: apiSources } = getSourcesByPhase({ isRemotePreferred, isMidasSearch, userCountry });

  const totalSources = rssSources.length + apiSources.length;
  const skippedGeo = SOURCE_REGISTRY.filter(s => s.enabled).length - totalSources;
  if (skippedGeo > 0) {
    log(`[GEO_FILTER] Skipped ${skippedGeo} sources not relevant for region "${userCountry}". Active: ${totalSources} sources.`);
  }

  if (rssSources.length > 0) {
    onProgress?.('Fetching Remote RSS feeds...');
    const rssPromises = rssSources.map(src =>
      sourceStream(src.name, src.makeFetcher(ctx), onSourceComplete, allJobs, forceRefresh ? null : buildSourceCacheKey(src.cacheId, activeQueries, location))
    );
    await Promise.allSettled(rssPromises);
    onProgress?.(`RSS: ${allJobs.length} remote jobs found.`);
  }

  // ---- Phase 2: All API + scraper + ATS sources (registry-driven) ----
  if (queries.length > 0) {
    onProgress?.(`Querying ${activeQueries.length} queries across ${apiSources.length} sources...`);

    const apiPromises = apiSources.map(src =>
      sourceStream(src.name, src.makeFetcher(ctx), onSourceComplete, allJobs, forceRefresh ? null : buildSourceCacheKey(src.cacheId, activeQueries, location))
    );
    const results = await Promise.allSettled(apiPromises);

    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        warn(`[STREAM] ${apiSources[i].name} failed: ${r.reason?.message || r.reason}`);
      }
    });

    const apiJobCount = allJobs.length;

    // Auto-broaden: if we got very few jobs, retry top queries without location
    if (apiJobCount < 15 && location) {
      const broaderQueries = activeQueries.slice(0, 3);
      onProgress?.(`Very few results (${apiJobCount}) — broadening top queries without location...`);
      log(`[AUTO_BROADEN_STREAM] ${apiJobCount} jobs with location, retrying ${broaderQueries.length} queries without location`);
      const broaderAdzunaPromise = sourceStream('Adzuna (broadened)', () => fetchAdzuna(broaderQueries, '', adzunaCountry, resolvedKeys.ADZUNA_APP_ID, resolvedKeys.ADZUNA_APP_KEY), onSourceComplete, allJobs);
      const broaderJsearchPromise = sourceStream('JSearch (broadened)', () => fetchJSearch(broaderQueries, null, resolvedKeys.JSEARCH_KEY), onSourceComplete, allJobs);
      const [broaderAdzuna, broaderJsearch] = await Promise.allSettled([broaderAdzunaPromise, broaderJsearchPromise]);
      const broadenedCount = (broaderAdzuna.status === 'fulfilled' ? broaderAdzuna.value.length : 0) + (broaderJsearch.status === 'fulfilled' ? broaderJsearch.value.length : 0);
      onProgress?.(`+${broadenedCount} from broader search.`);
    }

    // RSS fallback: if APIs returned very few results
    if (!isRemotePreferred && apiJobCount < 10) {
      onProgress?.(`APIs returned only ${apiJobCount} jobs — adding free RSS feeds as fallback...`);
      log(`[RSS_FALLBACK_STREAM] Sources returned ${apiJobCount} jobs, activating RSS fallback`);
      const remoteOkFallback = sourceStream('RemoteOK (fallback)', () => fetchRSS(REMOTEOK_FEED, 'RemoteOK', 50), onSourceComplete, allJobs);
      const remotiveFallback = sourceStream('Remotive (fallback)', () => fetchRemotive(), onSourceComplete, allJobs);
      await Promise.allSettled([remoteOkFallback, remotiveFallback]);
    }

    // Midas Search: expanded coverage via bonus RSS
    if (isMidasSearch) {
      onProgress?.('Midas Search: adding bonus RSS sources for deeper coverage...');
      const midasRemoteOkPromise = sourceStream('RemoteOK (Midas)', () => fetchRSS(REMOTEOK_FEED, 'RemoteOK', 100), onSourceComplete, allJobs);
      const midasRemotivePromise = sourceStream('Remotive (Midas)', () => fetchRemotive(), onSourceComplete, allJobs);
      const midasResults = await Promise.allSettled([midasRemoteOkPromise, midasRemotivePromise]);
      const midasCount = midasResults.reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value.length : 0), 0);
      onProgress?.(`+${midasCount} Midas Search bonus results.`);
    }
  } else {
    warn('[INGESTION_ORCHESTRATOR_STREAM] SKIPPED: No queries generated');
  }

  // Dedup — same logic as fetchAllJobs
  const seenUrls = new Set();
  let unique = allJobs.filter(j => {
    const url = j.apply_url;
    if (!url) return true;
    if (seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });

  const seenTitleCompany = new Set();
  unique = unique.filter(j => {
    const key = `${(j.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')}__${(j.company || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    if (seenTitleCompany.has(key)) return false;
    seenTitleCompany.add(key);
    return true;
  });

  const sources = {};
  for (const j of unique) {
    sources[j.source] = (sources[j.source] || 0) + 1;
  }

  onProgress?.(`Total: ${unique.length} unique jobs (deduped from ${allJobs.length} raw)`);
  warn(`[SCAN_COMPLETE] ${unique.length} unique jobs from ${Object.keys(sources).length} sources (${allJobs.length} raw). Breakdown: ${JSON.stringify(sources)}`);
  return { jobs: unique, sources, queries, roleAnchor, dominantPlatform, source, totalRaw: allJobs.length };
}
