// lib/job-fetcher.js — Fetch jobs from all sources (ported from Python)

import { getCachedJobs, cacheJobs } from './cache.js';
import { normalizeSkillsForSearch, rankSkillsForSearch } from './skill-normalizer.js';
import { log, warn, error as logError } from './logger.js';
import { fetchATSJobs } from './ats-fetcher.js';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

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
      signal: AbortSignal.timeout(60000), // Apify runs can take longer
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
      signal: AbortSignal.timeout(60000),
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

// ---- SerpAPI REMOVED — replaced by Serper.dev (free 2,500 queries/month) ----

// Legacy stub for backwards compatibility
async function fetchSerpAPI() {
  log('[SERP] DISABLED — SerpAPI removed. Using Serper.dev instead.');
  return { jobs: [], nextPageTokens: [] };
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
        type: 'search',
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

      // Process organic results for job postings
      const organic = data.organic || [];
      for (const item of organic) {
        const link = item.link;
        if (!link || seen.has(link)) continue;
        seen.add(link);

        // Extract company from snippet or title
        let company = '';
        let title = item.title || '';

        // Common patterns: "Job Title - Company | ..." or "Job Title at Company"
        const atMatch = title.match(/^(.+?)\s+at\s+(.+?)(?:\s*[|\-–]|$)/i);
        const dashMatch = title.match(/^(.+?)\s*[|\-–]\s*(.+?)(?:\s*[|\-–]|$)/);
        if (atMatch) {
          title = atMatch[1].trim();
          company = atMatch[2].trim();
        } else if (dashMatch) {
          title = dashMatch[1].trim();
          company = dashMatch[2].trim();
        }

        // Skip aggregator links
        let hostname;
        try {
          hostname = new URL(link).hostname.replace(/^www\./, '').toLowerCase();
        } catch { continue; }

        if (AGGREGATOR_DOMAINS.has(hostname)) continue;

        allJobs.push({
          title: title,
          company: company || hostname,
          location: '',
          description: item.snippet || '',
          url: link,
          source: 'Serper',
          postedAt: null,
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

/* eslint-disable no-unused-vars -- keeping original signature reference for future migration
async function _fetchSerpAPI_REMOVED(queries, location, apiKey, { nextPageTokens = null, countryCode = null } = {}) {
  const isPage2 = !!nextPageTokens;
  log('[SERP] Entry:', { hasKey: !!apiKey, queries: queries.length, location: location || 'global', page: isPage2 ? 2 : 1 });

  if (!apiKey) {
    warn('[SERP] SKIPPED: SERP_API_KEY not configured');
    return { jobs: [], nextPageTokens: [] };
  }

  if (!queries.length && !nextPageTokens?.length) {
    warn('[SERP] SKIPPED: No queries');
    return { jobs: [], nextPageTokens: [] };
  }

  const allJobs = [];
  const seen = new Set();
  let successfulQueries = 0;
  let failedQueries = 0;
  const collectedNextTokens = [];

  // If we have nextPageTokens, iterate those instead of queries
  const items = nextPageTokens ? nextPageTokens.slice(0, 7) : queries.slice(0, 7);
  for (const item of items) {
    const q = nextPageTokens ? null : item;
    const pageToken = nextPageTokens ? item : null;
    const queryText = q ? (typeof q === 'string' ? q : (q.q || q)) : 'page2';
    try {
      // Normalize location for SerpAPI (it expects canonical city, state, country format)
      let normalizedLocation = location;
      if (location) {
        // SerpAPI location mapping for common Indian cities
        const locationMap = {
          // Bangalore variations
          'bangalore': 'Bengaluru, Karnataka, India',
          'bangalore urban': 'Bengaluru, Karnataka, India',
          'bangalore urban, india': 'Bengaluru, Karnataka, India',
          'bangalore urban district': 'Bengaluru, Karnataka, India',
          'bangalore, india': 'Bengaluru, Karnataka, India',
          'bengaluru': 'Bengaluru, Karnataka, India',
          'bengaluru, india': 'Bengaluru, Karnataka, India',
          'karnataka (bangalore)': 'Bengaluru, Karnataka, India',

          // Mumbai variations
          'mumbai': 'Mumbai, Maharashtra, India',
          'mumbai, india': 'Mumbai, Maharashtra, India',

          // Delhi variations
          'delhi': 'Delhi, India',
          'new delhi': 'Delhi, India',
          'delhi, india': 'Delhi, India',

          // Hyderabad
          'hyderabad': 'Hyderabad, Telangana, India',
          'hyderabad, india': 'Hyderabad, Telangana, India',

          // Pune
          'pune': 'Pune, Maharashtra, India',
          'pune, india': 'Pune, Maharashtra, India',

          // Chennai
          'chennai': 'Chennai, Tamil Nadu, India',
          'chennai, india': 'Chennai, Tamil Nadu, India',

          // Kolkata
          'kolkata': 'Kolkata, West Bengal, India',
          'kolkata, india': 'Kolkata, West Bengal, India',

          // Generic India
          'india': 'India',
        };

        const locationKey = location.toLowerCase().trim();
        normalizedLocation = locationMap[locationKey] || location.replace(/\s+(Urban|Rural|District)/gi, '').trim();
      }

      // For page 2 (token-based), skip cache — tokens are ephemeral
      let cached = null;
      if (!pageToken) {
        const cacheKey = `serp_${encodeURIComponent(queryText.toLowerCase())}_${encodeURIComponent((normalizedLocation || 'global').toLowerCase())}`;
        if (process.env.NODE_ENV !== 'test') {
          cached = await getCachedJobs(cacheKey);
        }

        if (cached) {
          log(`[SERP] Cache HIT: "${queryText}" → ${cached.length} cached jobs`);
          for (const job of cached) {
            const key = `${job.title}__${job.company}`.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              allJobs.push(job);
            }
          }
          successfulQueries++;
          continue;
        }
      }

      let requestUrl;
      if (pageToken) {
        // Page 2+: pass the opaque next_page_token — encodes query context
        requestUrl = `https://serpapi.com/search.json?engine=google_jobs&api_key=${apiKey}&next_page_token=${encodeURIComponent(pageToken)}`;
        log(`[SERP] Fetching page 2 via next_page_token`);
      } else {
        requestUrl = `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(queryText)}&api_key=${apiKey}&num=10&chips=date_posted:month`;
        if (normalizedLocation) {
          requestUrl += `&location=${encodeURIComponent(normalizedLocation)}`;
        }
        // Add country code for geo-targeted results (gl=in for India, gl=us for US, etc.)
        if (countryCode) {
          requestUrl += `&gl=${encodeURIComponent(countryCode.toLowerCase())}`;
        }
        log(`[SERP] Fetching: "${queryText}" | ${normalizedLocation || 'global'}`);
      }

      const res = await fetch(requestUrl, {
        signal: AbortSignal.timeout(15000),
      });


      if (!res.ok) {
        failedQueries++;
        try {
          const errorBody = await res.text();
          logError(`[SERP] HTTP ${res.status} for "${queryText}":`, errorBody.slice(0, 300));
        } catch (e) {
          logError(`[SERP] HTTP ${res.status} for "${queryText}" (no body)`);
        }
        continue;
      }

      const data = await res.json();
      const jobsFound = (data.jobs_results || []).length;
      log(`[SERP] "${queryText}" → ${jobsFound} jobs`);

      // Collect next_page_token for Midas Search pagination
      if (!pageToken && data.serpapi_pagination?.next_page_token) {
        collectedNextTokens.push(data.serpapi_pagination.next_page_token);
      }

      // Array to store jobs retrieved specifically from this fetch for the cache
      const queryJobs = [];

      for (const job of (data.jobs_results || [])) {
        const key = `${job.title}__${job.company_name}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        // Determine actual source from extensions
        // Replace aggregator source names with "Google Jobs" — user shouldn't see "Jobrapido.com"
        const via = (job.via || '').replace('via ', '');
        let source = via || 'Google Jobs';
        try {
          const viaHost = via.toLowerCase().replace(/^www\./, '').replace(/\.com$|\.org$|\.net$|\.co$/, '');
          if (_isAggregator(via.toLowerCase().replace(/^www\./, '')) ||
              AGGREGATOR_DOMAINS.has(via.toLowerCase().replace(/^www\./, ''))) {
            source = 'Google Jobs';
          }
        } catch {};

        // Build apply URL — prefer direct company/ATS links, skip aggregator middlemen
        let applyUrl = pickBestApplyUrl(
          job.apply_options,
          job.company_name || '',
          job.title || '',
          job.job_id,
          queryText
        );

        // Also check share_link and related_links as secondary options
        if (!applyUrl || applyUrl.includes('google.com/search')) {
          if (job.share_link) {
            applyUrl = job.share_link;
          } else if (job.related_links && job.related_links.length > 0) {
            // Filter related_links through aggregator check too
            const goodLink = job.related_links.find(rl => {
              try { return !_isAggregator(new URL(rl.link).hostname.replace(/^www\./, '')); }
              catch { return false; }
            });
            if (goodLink) applyUrl = goodLink.link;
          }
        }

        const formattedJob = {
          title: job.title || '',
          company: job.company_name || 'Unknown',
          summary: stripHtml(job.description || '').slice(0, 5000),
          apply_url: applyUrl,
          source,
          location: job.location || '',
          date_posted: job.detected_extensions?.posted_at || '',
          location_tags: extractLocationTags(`${job.title} ${job.description} ${job.location}`),
        };

        queryJobs.push(formattedJob);
        allJobs.push(formattedJob);
      }

      // Cache page 1 results for 24-48 hours (page 2 uses ephemeral tokens, skip cache)
      if (!pageToken && queryJobs.length > 0) {
        const storeCacheKey = `serp_${encodeURIComponent(queryText.toLowerCase())}_${encodeURIComponent((normalizedLocation || 'global').toLowerCase())}`;
        await cacheJobs(storeCacheKey, queryJobs, 21600); // 6h cache — balances freshness vs token cost
      }

      successfulQueries++;

      // Rate limit: 800ms delay (increased for Vercel Pro's 60s timeout)
      await new Promise(r => setTimeout(r, 800));
    } catch (e) {
      failedQueries++;
      logError(`[SERP] Query "${queryText}" exception:`, e.message);
    }
  }

  log(`[SERP] Done: ${successfulQueries}/${items.length} ok, ${failedQueries} failed, ${allJobs.length} jobs (page ${isPage2 ? 2 : 1})`);

  return { jobs: allJobs, nextPageTokens: collectedNextTokens };
}
eslint-enable no-unused-vars */

// ---- Fetch JSearch (RapidAPI) ----
async function fetchJSearch(queries, location, apiKey) {
  if (!apiKey || !queries.length) return [];
  const allJobs = [];

  for (const q of queries.slice(0, 6)) {
    try {
      const params = new URLSearchParams({
        query: location ? `${q} in ${location}` : q,
        num_pages: '1',
      });

      const url = `https://jsearch-mega.p.rapidapi.com/search?${params}`;
      const opts = {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'jsearch-mega.p.rapidapi.com',
        },
      };

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

TIER 1 — CORE ROLE (4 queries): Direct title matches
- Query 1: Their exact job title (e.g. "Product Manager")
- Query 2: Alternative title/synonym (e.g. "Program Manager")
- Query 3: Role + seniority level (e.g. "Senior Product Manager")
- Query 4: Another common synonym (e.g. "Product Owner")

TIER 2 — INDUSTRY/DOMAIN (3 queries): Role in specific contexts
- Query 5: Role + industry vertical (e.g. "Fintech Product Manager")
- Query 6: Role + niche domain (e.g. "SaaS Implementation Lead")
- Query 7: Adjacent role they could transition to (e.g. "Solutions Architect")

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
    let text = (data.choices?.[0]?.message?.content || '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to extract JSON from LLM response');

    const parsed = JSON.parse(jsonMatch[0]);

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

    const [serperJobs, adzunaJobs, jsearchJobs, linkedinJobs, arbeitnowJobs, museJobs, himalayasJobs, jobicyJobs, findworkJobs, usajobsJobs, wwrJobs, joobleJobs, reedJobs, devitJobs, linkedinSearchJobs, activeDbJobs, indeedJobs, bingJobs, apifyJobs, naukriJobs, weekdayJobs] = await Promise.all([
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
    ]);

    allJobs.push(...serperJobs, ...adzunaJobs, ...jsearchJobs, ...linkedinJobs, ...arbeitnowJobs, ...museJobs, ...himalayasJobs, ...jobicyJobs, ...findworkJobs, ...usajobsJobs, ...wwrJobs, ...joobleJobs, ...reedJobs, ...devitJobs, ...linkedinSearchJobs, ...activeDbJobs, ...indeedJobs, ...bingJobs, ...apifyJobs, ...naukriJobs, ...weekdayJobs, ...apnaJobs);
    onProgress?.(`+${serperJobs.length} Serper, +${adzunaJobs.length} Adzuna, +${jsearchJobs.length} JSearch, +${linkedinJobs.length} LinkedIn, +${arbeitnowJobs.length} Arbeitnow, +${museJobs.length} The Muse, +${himalayasJobs.length} Himalayas, +${jobicyJobs.length} Jobicy, +${findworkJobs.length} Findwork, +${usajobsJobs.length} USAJOBS, +${wwrJobs.length} WWR, +${joobleJobs.length} Jooble, +${reedJobs.length} Reed, +${devitJobs.length} DevITjobs, +${linkedinSearchJobs.length} LinkedIn(Fantastic), +${activeDbJobs.length} ActiveJobsDB, +${indeedJobs.length} Indeed, +${bingJobs.length} Bing, +${apifyJobs.length} Apify, +${naukriJobs.length} Naukri, +${weekdayJobs.length} Weekday, +${apnaJobs.length} Apna.`);

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
export async function fetchAllJobsStreaming(profile, apiKeys = {}, onSourceComplete, onProgress, preferences = {}) {
  const jsearchKey = apiKeys.JSEARCH_KEY || process.env.JSEARCH_KEY;
  const linkedinKey = apiKeys.LINKEDIN_API_KEY || process.env.LINKEDIN_API_KEY || '';
  const openRouterKey = apiKeys.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  const adzunaAppId = apiKeys.ADZUNA_APP_ID || process.env.ADZUNA_APP_ID;
  const adzunaAppKey = apiKeys.ADZUNA_APP_KEY || process.env.ADZUNA_APP_KEY;

  const { queries, location, isRemotePreferred, roleAnchor, dominantPlatform, source } = await buildQueries(profile, preferences, openRouterKey);
  log(`[QUERY_PLANNER_STREAM] Query source: ${source} | roleAnchor: ${roleAnchor} | dominantPlatform: ${dominantPlatform}`);

  onProgress?.(isRemotePreferred ? 'Fetching remote-first jobs...' : `Fetching jobs near ${location}...`);

  let allJobs = [];

  // ---- Remote RSS feeds (only if remote preferred) ----
  if (isRemotePreferred) {
    onProgress?.('Fetching Remote RSS feeds...');

    const remoteOkPromise = fetchRSS(REMOTEOK_FEED, 'RemoteOK', 100).then(jobs => {
      onSourceComplete('RemoteOK', jobs);
      allJobs.push(...jobs);
      return jobs;
    });
    const jobicyPromise = fetchRSS(JOBICY_FEED, 'Jobicy').then(jobs => {
      onSourceComplete('Jobicy', jobs);
      allJobs.push(...jobs);
      return jobs;
    });
    const remotivePromise = fetchRemotive().then(jobs => {
      onSourceComplete('Remotive', jobs);
      allJobs.push(...jobs);
      return jobs;
    });
    const simplyHiredPromise = fetchRSS(SIMPLYHIRED_FEED, 'SimplyHired', 50).then(jobs => {
      onSourceComplete('SimplyHired', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    await Promise.allSettled([remoteOkPromise, jobicyPromise, remotivePromise, simplyHiredPromise]);
    onProgress?.(`RSS: ${allJobs.length} remote jobs found.`);
  }

  // ---- All API sources (paid + free) ----
  const isMidasSearch = preferences.midasSearch === true;
  const findworkKey = apiKeys.FINDWORK_API_KEY || process.env.FINDWORK_API_KEY;
  const serperKey = apiKeys.SERPER_API_KEY || process.env.SERPER_API_KEY;
  const usajobsKey = apiKeys.USAJOBS_API_KEY || process.env.USAJOBS_API_KEY;
  const joobleKey = apiKeys.JOOBLE_API_KEY || process.env.JOOBLE_API_KEY;
  const reedKey = apiKeys.REED_API_KEY || process.env.REED_API_KEY;

  if (queries.length > 0) {
    const adzunaCountry = preferences.country || profile.country || 'US';
    const adzunaLocation = preferences.city || preferences.state || '';
    const queryCount = isMidasSearch ? Math.min(queries.length, 12) : Math.min(queries.length, 7);
    const activeQueries = queries.slice(0, queryCount);
    onProgress?.(`Querying ${activeQueries.length} queries across Serper + JSearch + LinkedIn + Adzuna + USAJOBS + Jooble + Reed + WWR + Himalayas + Jobicy + Findwork...`);

    const serperPromise = fetchSerper(activeQueries.slice(0, 5), location, serperKey).then(jobs => {
      onSourceComplete('Serper', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const adzunaPromise = fetchAdzuna(activeQueries, adzunaLocation, adzunaCountry, adzunaAppId, adzunaAppKey).then(jobs => {
      onSourceComplete('Adzuna', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const jsearchPromise = fetchJSearch(activeQueries.slice(0, isMidasSearch ? 10 : 6), location, jsearchKey).then(jobs => {
      onSourceComplete('JSearch', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const linkedinPromise = fetchLinkedIn(activeQueries.slice(0, 4), location, linkedinKey).then(jobs => {
      onSourceComplete('LinkedIn', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const arbeitnowPromise = fetchArbeitnow().then(jobs => {
      onSourceComplete('Arbeitnow', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const musePromise = fetchTheMuse(activeQueries.slice(0, 2)).then(jobs => {
      onSourceComplete('The Muse', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const himalayasPromise = fetchHimalayas().then(jobs => {
      onSourceComplete('Himalayas', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const jobicyPromise = fetchJobicy().then(jobs => {
      onSourceComplete('Jobicy', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const findworkPromise = fetchFindwork(findworkKey).then(jobs => {
      onSourceComplete('Findwork', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const usajobsPromise = fetchUSAJobs(activeQueries.slice(0, 3), usajobsKey).then(jobs => {
      onSourceComplete('USAJOBS', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const wwrPromise = fetchWeWorkRemotely().then(jobs => {
      onSourceComplete('WeWorkRemotely', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const jooblePromise = fetchJooble(activeQueries.slice(0, 3), location, joobleKey).then(jobs => {
      onSourceComplete('Jooble', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const reedPromise = fetchReed(activeQueries.slice(0, 3), reedKey).then(jobs => {
      onSourceComplete('Reed', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const devitPromise = fetchDevITjobs().then(jobs => {
      onSourceComplete('DevITjobs', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const linkedinSearchPromise = fetchLinkedInJobSearch(activeQueries.slice(0, 3), location, jsearchKey).then(jobs => {
      onSourceComplete('LinkedIn (Fantastic)', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const activeDbPromise = fetchActiveJobsDB(activeQueries.slice(0, 3), location, jsearchKey).then(jobs => {
      onSourceComplete('ActiveJobsDB', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const indeedPromise = fetchIndeedViaJobsAPI(activeQueries.slice(0, 3), location, adzunaCountry, jsearchKey).then(jobs => {
      onSourceComplete('Indeed', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const bingPromise = fetchBingJobs(activeQueries.slice(0, 3), location, jsearchKey).then(jobs => {
      onSourceComplete('Bing Jobs', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const apifyPromise = fetchApifyAllJobs(activeQueries, location).then(jobs => {
      onSourceComplete('Apify', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const naukriPromise = fetchApifyNaukri(activeQueries).then(jobs => {
      onSourceComplete('Naukri', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const atsPromise = fetchATSJobs(activeQueries, location, profile).then(jobs => {
      onSourceComplete('Direct (ATS)', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const weekdayPromise = fetchWeekday(activeQueries.slice(0, 1), location).then(jobs => {
      onSourceComplete('Weekday', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const apnaPromise = fetchApna(activeQueries.slice(0, 1), location).then(jobs => {
      onSourceComplete('Apna', jobs);
      allJobs.push(...jobs);
      return jobs;
    });

    const results = await Promise.allSettled([serperPromise, adzunaPromise, jsearchPromise, linkedinPromise, arbeitnowPromise, musePromise, himalayasPromise, jobicyPromise, findworkPromise, usajobsPromise, wwrPromise, jooblePromise, reedPromise, devitPromise, linkedinSearchPromise, activeDbPromise, indeedPromise, bingPromise, apifyPromise, naukriPromise, atsPromise, weekdayPromise, apnaPromise]);

    // Log any rejected sources
    const sourceNames = ['Serper', 'Adzuna', 'JSearch', 'LinkedIn', 'Arbeitnow', 'The Muse', 'Himalayas', 'Jobicy', 'Findwork', 'USAJOBS', 'WeWorkRemotely', 'Jooble', 'Reed', 'DevITjobs', 'LinkedIn (Fantastic)', 'ActiveJobsDB', 'Indeed', 'Bing Jobs', 'Apify', 'Naukri', 'Direct (ATS)', 'Weekday', 'Apna'];
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        warn(`[STREAM] ${sourceNames[i]} failed: ${r.reason?.message || r.reason}`);
      }
    });

    // Count API jobs for fallback logic
    const serperJobs = results[0].status === 'fulfilled' ? results[0].value : [];
    const adzunaJobs = results[1].status === 'fulfilled' ? results[1].value : [];
    const jsearchJobs = results[2].status === 'fulfilled' ? results[2].value : [];
    const linkedinJobs = results[3].status === 'fulfilled' ? results[3].value : [];
    const atsJobs = results[20].status === 'fulfilled' ? results[20].value : [];

    // Auto-broaden: if location-specific search returned very few results
    const apiJobCount = adzunaJobs.length + jsearchJobs.length + linkedinJobs.length;
    if (location && apiJobCount < 3) {
      const broaderQueries = activeQueries.slice(0, 2);
      onProgress?.(`Very few results (${apiJobCount}) — broadening top queries without location...`);
      log(`[AUTO_BROADEN_STREAM] ${apiJobCount} jobs with location, retrying ${broaderQueries.length} queries without location`);
      const broaderAdzunaPromise = fetchAdzuna(broaderQueries, '', adzunaCountry, adzunaAppId, adzunaAppKey).then(jobs => {
        onSourceComplete('Adzuna (broadened)', jobs);
        allJobs.push(...jobs);
        return jobs;
      });
      const broaderJsearchPromise = fetchJSearch(broaderQueries, null, jsearchKey).then(jobs => {
        onSourceComplete('JSearch (broadened)', jobs);
        allJobs.push(...jobs);
        return jobs;
      });
      const [broaderAdzuna, broaderJsearch] = await Promise.allSettled([broaderAdzunaPromise, broaderJsearchPromise]);
      const broadenedCount = (broaderAdzuna.status === 'fulfilled' ? broaderAdzuna.value.length : 0) + (broaderJsearch.status === 'fulfilled' ? broaderJsearch.value.length : 0);
      onProgress?.(`+${broadenedCount} from broader search.`);
    }

    // RSS fallback: if APIs returned very few results
    const totalApiJobs = apiJobCount + atsJobs.length;
    if (!isRemotePreferred && totalApiJobs < 10) {
      onProgress?.(`APIs returned only ${totalApiJobs} jobs — adding free RSS feeds as fallback...`);
      log(`[RSS_FALLBACK_STREAM] Sources returned ${totalApiJobs} jobs, activating RSS fallback`);

      const remoteOkFallback = fetchRSS(REMOTEOK_FEED, 'RemoteOK', 50).then(jobs => {
        onSourceComplete('RemoteOK (fallback)', jobs);
        allJobs.push(...jobs);
        return jobs;
      });
      const remotiveFallback = fetchRemotive().then(jobs => {
        onSourceComplete('Remotive (fallback)', jobs);
        allJobs.push(...jobs);
        return jobs;
      });

      await Promise.allSettled([remoteOkFallback, remotiveFallback]);
    }

    // Midas Search: expanded coverage via broader queries + bonus RSS
    if (isMidasSearch) {
      onProgress?.('Midas Search: adding bonus RSS sources for deeper coverage...');
      const midasRemoteOkPromise = fetchRSS(REMOTEOK_FEED, 'RemoteOK', 100).then(jobs => {
        onSourceComplete('RemoteOK (Midas)', jobs);
        allJobs.push(...jobs);
        return jobs;
      });
      const midasRemotivePromise = fetchRemotive().then(jobs => {
        onSourceComplete('Remotive (Midas)', jobs);
        allJobs.push(...jobs);
        return jobs;
      });
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
  log(`[FETCH_ALL_STREAM] Source breakdown:`, JSON.stringify(sources));
  return { jobs: unique, sources, queries, roleAnchor, dominantPlatform, source, totalRaw: allJobs.length };
}
