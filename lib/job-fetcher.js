// lib/job-fetcher.js — Fetch jobs from all sources (ported from Python)

const NETWORK_TIMEOUT = 25000;

// Lever companies (India-focused + global)
const LEVER_COMPANIES = [
  'meesho', 'cred', 'razorpay', 'groww', 'zerodha', 'phonepe',
  'swiggy', 'zomato', 'ola', 'flipkart', 'paytm', 'dream11',
  'slice', 'jupiter', 'fi-money', 'smallcase', 'cleartax',
  'browserstack', 'postman', 'freshworks', 'zoho', 'chargebee',
];

const WWR_FEEDS = [
  'https://weworkremotely.com/categories/remote-programming-jobs.rss',
  'https://weworkremotely.com/categories/remote-customer-support-jobs.rss',
  'https://weworkremotely.com/categories/remote-product-jobs.rss',
  'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
  'https://weworkremotely.com/categories/remote-finance-legal-jobs.rss',
  'https://weworkremotely.com/categories/remote-business-exec-management-jobs.rss',
];

const REMOTEOK_FEED = 'https://remoteok.com/remote-jobs.rss';
const JOBICY_FEED = 'https://jobicy.com/feed/newjobs';
const SIMPLYHIRED_FEED = 'https://www.simplyhired.com/search/rss';

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
      headers: { 'User-Agent': 'JobBot/1.0' },
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
    console.error(`RSS ${sourceName} failed:`, e.message);
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
      summary: stripHtml(j.description || '').slice(0, 1000),
      apply_url: j.url || '',
      source: 'Remotive',
      date_posted: j.publication_date || '',
      location: j.candidate_required_location || '',
      location_tags: extractLocationTags(`${j.title} ${j.description} ${j.candidate_required_location}`),
    }));
  } catch (e) {
    console.error('Remotive failed:', e.message);
    return [];
  }
}

// ---- Fetch Lever ----
async function fetchLever(companies = LEVER_COMPANIES, maxPerCompany = 15) {
  const allJobs = [];
  for (const company of companies) {
    try {
      const res = await fetch(`https://api.lever.co/v0/postings/${company}?mode=json&limit=${maxPerCompany}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const postings = await res.json();
      if (!Array.isArray(postings)) continue;

      for (const p of postings) {
        allJobs.push({
          title: p.text || '',
          company: company.charAt(0).toUpperCase() + company.slice(1),
          summary: stripHtml(p.descriptionPlain || p.description || '').slice(0, 1000),
          apply_url: p.hostedUrl || p.applyUrl || '',
          source: 'Lever',
          date_posted: p.createdAt ? new Date(p.createdAt).toISOString() : '',
          location: (p.categories?.location) || '',
          location_tags: extractLocationTags(`${p.text} ${p.categories?.location || ''}`),
        });
      }
    } catch {
      // skip failed company
    }
  }
  return allJobs;
}

// ---- Fetch SerpAPI (Google Jobs) ----
async function fetchSerpAPI(queries, location, apiKey) {
  // DIAGNOSTIC LOG: Entry point
  console.log('[SERP_DIAGNOSTIC] Entry:', {
    serpTriggered: true,
    hasApiKey: !!apiKey,
    queryCount: queries.length,
    location: location || 'global'
  });

  if (!apiKey) {
    console.warn('[SERP_DIAGNOSTIC] SKIPPED: API key not configured (SERP_API_KEY missing)');
    return [];
  }

  if (!queries.length) {
    console.warn('[SERP_DIAGNOSTIC] SKIPPED: No queries generated');
    return [];
  }

  const allJobs = [];
  const seen = new Set();
  let successfulQueries = 0;
  let failedQueries = 0;

  for (const q of queries.slice(0, 6)) {
    try {
      // Normalize location for SerpAPI (it expects canonical city, state, country format)
      let normalizedLocation = location;
      if (location) {
        // SerpAPI location mapping for common Indian cities
        const locationMap = {
          // Bangalore variations
          'bangalore': 'Bengaluru, Karnataka, India',
          'bangalore urban': 'Bengaluru, Karnataka, India',
          'bangalore, india': 'Bengaluru, Karnataka, India',
          'bengaluru': 'Bengaluru, Karnataka, India',
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

      const params = new URLSearchParams({
        engine: 'google_jobs',
        q: q.q || q,
        api_key: apiKey,
        num: '10',
      });
      if (q.location || normalizedLocation) {
        params.set('location', q.location || normalizedLocation);
      }

      const requestUrl = `https://serpapi.com/search.json?${params}`;
      console.log(`[SERP_DIAGNOSTIC] Query: "${q.q || q}" | Location: ${q.location || normalizedLocation || 'none'}`);

      const res = await fetch(requestUrl, {
        signal: AbortSignal.timeout(15000),
      });

      console.log(`[SERP_DIAGNOSTIC] Response: HTTP ${res.status} for query "${q.q || q}"`);

      if (!res.ok) {
        failedQueries++;

        // Log response body for debugging
        try {
          const errorBody = await res.text();
          console.error(`[SERP_DIAGNOSTIC] HTTP ${res.status} Error Body:`, errorBody.slice(0, 500));
        } catch (e) {
          console.error(`[SERP_DIAGNOSTIC] Could not read error body`);
        }

        if (res.status === 401) console.error('[SERP_DIAGNOSTIC] ERROR: Invalid API key (HTTP 401)');
        if (res.status === 429) console.warn('[SERP_DIAGNOSTIC] WARNING: Rate limit exceeded (HTTP 429)');
        if (res.status === 403) console.error('[SERP_DIAGNOSTIC] ERROR: Access forbidden (HTTP 403)');
        if (res.status === 400) console.error('[SERP_DIAGNOSTIC] ERROR: Bad request - check query/location format (HTTP 400)');
        continue;
      }

      const data = await res.json();
      const jobsFound = (data.jobs_results || []).length;
      console.log(`[SERP_DIAGNOSTIC] Jobs found: ${jobsFound} for query "${q.q || q}"`);

      for (const job of (data.jobs_results || [])) {
        const key = `${job.title}__${job.company_name}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        // Determine actual source from extensions
        const via = (job.via || '').replace('via ', '');
        const source = via || 'Google Jobs';

        // Get apply URL: use google_jobs_listing API for real apply links
        let applyUrl = '';
        if (job.job_id) {
          try {
            const listingParams = new URLSearchParams({
              engine: 'google_jobs_listing',
              q: job.job_id,
              api_key: apiKey,
            });
            const listingRes = await fetch(`https://serpapi.com/search.json?${listingParams}`, {
              signal: AbortSignal.timeout(8000),
            });
            if (listingRes.ok) {
              const listingData = await listingRes.json();
              // apply_options is an array of { title, link } objects
              const options = listingData.apply_options || [];
              if (options.length > 0) {
                applyUrl = options[0].link || '';
                console.log(`[SERP_DIAGNOSTIC] Apply URL found via listing API: ${applyUrl.slice(0, 80)}...`);
              }
            }
          } catch (e) {
            console.warn(`[SERP_DIAGNOSTIC] Listing fetch failed for job_id: ${e.message}`);
          }
        }

        // Fallback: construct a Google search URL for this specific job
        if (!applyUrl) {
          const searchQ = encodeURIComponent(`${job.title} ${job.company_name} apply`);
          applyUrl = `https://www.google.com/search?q=${searchQ}&ibp=htl;jobs`;
        }

        allJobs.push({
          title: job.title || '',
          company: job.company_name || 'Unknown',
          summary: stripHtml(job.description || '').slice(0, 1000),
          apply_url: applyUrl,
          source,
          location: job.location || '',
          date_posted: job.detected_extensions?.posted_at || '',
          location_tags: extractLocationTags(`${job.title} ${job.description} ${job.location}`),
        });
      }

      successfulQueries++;

      // Rate limit
      await new Promise(r => setTimeout(r, 1100));
    } catch (e) {
      failedQueries++;
      console.error(`[SERP_DIAGNOSTIC] ERROR: Query "${q.q || q}" failed:`, e.message);
    }
  }

  // DIAGNOSTIC LOG: Summary
  console.log('[SERP_DIAGNOSTIC] Summary:', {
    totalQueries: queries.slice(0, 6).length,
    successfulQueries,
    failedQueries,
    jobsReturned: allJobs.length,
    uniqueJobs: allJobs.length
  });

  return allJobs;
}

// ---- Fetch JSearch (RapidAPI) ----
async function fetchJSearch(queries, location, apiKey) {
  if (!apiKey || !queries.length) return [];
  const allJobs = [];

  for (const q of queries.slice(0, 5)) {
    try {
      const params = new URLSearchParams({
        query: location ? `${q} in ${location}` : q,
        num_pages: '1',
      });

      const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const data = await res.json();

      for (const job of (data.data || [])) {
        allJobs.push({
          title: job.job_title || '',
          company: job.employer_name || 'Unknown',
          summary: stripHtml(job.job_description || '').slice(0, 1000),
          apply_url: job.job_apply_link || '',
          source: job.job_publisher || 'JSearch',
          location: [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', '),
          date_posted: job.job_posted_at_datetime_utc || '',
          location_tags: extractLocationTags(`${job.job_title} ${job.job_description} ${job.job_city} ${job.job_country}`),
        });
      }

      await new Promise(r => setTimeout(r, 1200));
    } catch (e) {
      console.error(`JSearch query "${q}" failed:`, e.message);
    }
  }
  return allJobs;
}

// ---- Build queries from profile & preferences ----
export function buildQueries(profile, preferences = {}) {
  const headline = (profile.headline || '').trim();
  const skills = profile.skills || [];
  const searchTerms = profile.search_terms || [];
  const industry = (profile.industry || '').trim();

  // Use explicit preference if set, otherwise fallback to profile
  const preferredLocation = preferences.location || profile.country || '';
  const isRemote = preferences.remoteOnly || ['remote only', 'remote', 'global'].includes(preferredLocation.toLowerCase());

  let location = null;
  if (!isRemote && preferredLocation) {
    location = preferredLocation;
  }

  const queries = [];
  // ... rest of query building ...
  for (const term of searchTerms.slice(0, 5)) queries.push(term);
  if (headline && queries.length < 8) queries.push(headline);
  if (industry && queries.length < 8) queries.push(`${industry} jobs`);
  for (const skill of skills.slice(0, 2)) {
    if (queries.length < 10 && skill.split(' ').length <= 3) queries.push(`${skill} specialist`);
  }

  // Deduplicate
  const seen = new Set();
  const unique = queries.filter(q => {
    const k = q.toLowerCase().trim();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return { queries: unique.slice(0, 10), location };
}

// ---- Main fetch function ----
export async function fetchAllJobs(profile, apiKeys = {}, onProgress, preferences = {}) {
  const serpKey = apiKeys.SERP_API_KEY || process.env.SERP_API_KEY;
  const jsearchKey = apiKeys.JSEARCH_KEY || process.env.JSEARCH_KEY;

  const { queries, location } = buildQueries(profile, preferences);

  // Decide if we should prioritize local feeds or remote feeds
  // If user explicitly checked "Remote Only" or didn't set location, default to remote feeds
  const isRemotePreferred = preferences.remoteOnly || !location;

  onProgress?.(isRemotePreferred ? 'Fetching remote-first jobs...' : `Fetching jobs near ${location}...`);

  // Parallel fetches for speed
  // If remote preferred, fetch all remote feeds. If local, maybe skip some or prioritize local.
  // For simplicity, we fetch WWR always, but leverage SerpAPI/JSearch for strict location.
  const feedsToFetch = isRemotePreferred ? WWR_FEEDS : WWR_FEEDS.slice(0, 2);

  const [wwrResults, remoteOkResult, jobicyResult, remotiveResult, simplyHiredResult] = await Promise.all([
    Promise.all(feedsToFetch.map(url => fetchRSS(url, 'WeWorkRemotely'))),
    fetchRSS(REMOTEOK_FEED, 'RemoteOK', 100),
    fetchRSS(JOBICY_FEED, 'Jobicy'),
    fetchRemotive(),
    fetchRSS(SIMPLYHIRED_FEED, 'SimplyHired', 50),
  ]);

  let allJobs = [
    ...wwrResults.flat(),
    ...remoteOkResult,
    ...jobicyResult,
    ...remotiveResult,
    ...simplyHiredResult,
  ];

  onProgress?.(`RSS: ${allJobs.length} jobs. Fetching Lever...`);

  // Lever (sequential due to rate limiting)
  const leverJobs = await fetchLever();
  allJobs.push(...leverJobs);

  onProgress?.(`+${leverJobs.length} Lever. Fetching Google Jobs...`);

  // SerpAPI / JSearch (need API keys)
  if (queries.length > 0) {
    console.log('[INGESTION_ORCHESTRATOR] SerpAPI execution gate: queries.length =', queries.length);
    console.log('[INGESTION_ORCHESTRATOR] SERP_API_KEY present:', !!serpKey);

    const serpJobs = await fetchSerpAPI(queries, location, serpKey);
    allJobs.push(...serpJobs);
    onProgress?.(`+${serpJobs.length} SerpAPI.`);
    console.log('[INGESTION_ORCHESTRATOR] SerpAPI contributed:', serpJobs.length, 'jobs');

    const jsearchJobs = await fetchJSearch(queries, location, jsearchKey);
    allJobs.push(...jsearchJobs);
    onProgress?.(`+${jsearchJobs.length} JSearch.`);
  } else {
    console.warn('[INGESTION_ORCHESTRATOR] SerpAPI SKIPPED: No queries generated');
  }

  // Deduplicate by URL
  const seenUrls = new Set();
  const unique = allJobs.filter(j => {
    const url = j.apply_url;
    if (!url) return true;
    if (seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });

  // Source breakdown
  const sources = {};
  for (const j of unique) {
    sources[j.source] = (sources[j.source] || 0) + 1;
  }

  onProgress?.(`Total: ${unique.length} unique jobs`);
  return { jobs: unique, sources, queries };
}
