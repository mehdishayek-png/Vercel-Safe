// lib/job-fetcher.js — Fetch jobs from all sources (ported from Python)

import { getCachedJobs, cacheJobs, generateSerpCacheKey } from './cache.js';
import { normalizeSkillsForSearch, rankSkillsForSearch } from './skill-normalizer.js';

const NETWORK_TIMEOUT = 25000;

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



// ---- Fetch SerpAPI (Google Jobs) ----
async function fetchSerpAPI(queries, location, apiKey, { nextPageTokens = null } = {}) {
  const isPage2 = !!nextPageTokens;
  console.log('[SERP] Entry:', { hasKey: !!apiKey, queries: queries.length, location: location || 'global', page: isPage2 ? 2 : 1 });

  if (!apiKey) {
    console.warn('[SERP] SKIPPED: SERP_API_KEY not configured');
    return { jobs: [], nextPageTokens: [] };
  }

  if (!queries.length && !nextPageTokens?.length) {
    console.warn('[SERP] SKIPPED: No queries');
    return { jobs: [], nextPageTokens: [] };
  }

  const allJobs = [];
  const seen = new Set();
  let successfulQueries = 0;
  let failedQueries = 0;
  const collectedNextTokens = [];

  // If we have nextPageTokens, iterate those instead of queries
  const items = nextPageTokens || queries.slice(0, 6);
  for (const item of items) {
    const q = nextPageTokens ? null : item;
    const pageToken = nextPageTokens ? item : null;
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
      const queryText = q ? (q.q || q) : 'page2';
      let cached = null;
      if (!pageToken) {
        const cacheKey = `serp_${encodeURIComponent(queryText.toLowerCase())}_${encodeURIComponent((normalizedLocation || 'global').toLowerCase())}`;
        if (process.env.NODE_ENV !== 'test') {
          cached = await getCachedJobs(cacheKey);
        }

        if (cached) {
          console.log(`[SERP] Cache HIT: "${queryText}" → ${cached.length} cached jobs`);
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
        console.log(`[SERP] Fetching page 2 via next_page_token`);
      } else {
        requestUrl = `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(queryText)}&api_key=${apiKey}&num=10&chips=date_posted:month`;
        if (normalizedLocation) {
          requestUrl += `&location=${encodeURIComponent(normalizedLocation)}`;
        }
        console.log(`[SERP] Fetching: "${queryText}" | ${normalizedLocation || 'global'}`);
      }

      const res = await fetch(requestUrl, {
        signal: AbortSignal.timeout(15000),
      });


      if (!res.ok) {
        failedQueries++;
        try {
          const errorBody = await res.text();
          console.error(`[SERP] HTTP ${res.status} for "${queryText}":`, errorBody.slice(0, 300));
        } catch (e) {
          console.error(`[SERP] HTTP ${res.status} for "${queryText}" (no body)`);
        }
        continue;
      }

      const data = await res.json();
      const jobsFound = (data.jobs_results || []).length;
      console.log(`[SERP] "${queryText}" → ${jobsFound} jobs`);

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
        const via = (job.via || '').replace('via ', '');
        const source = via || 'Google Jobs';

        // Build apply URL from available SerpAPI fields
        // Priority: apply_options (direct) > share_link > related_links > Google Jobs direct link > search fallback
        let applyUrl = '';
        if (job.apply_options && job.apply_options.length > 0) {
          applyUrl = job.apply_options[0].link;
        } else if (job.share_link) {
          applyUrl = job.share_link;
        } else if (job.related_links && job.related_links.length > 0) {
          applyUrl = job.related_links[0].link;
        }

        // If we have a job_id, construct a direct Google Jobs URL that opens the job panel
        if (!applyUrl && job.job_id) {
          const searchQ = encodeURIComponent(queryText);
          applyUrl = `https://www.google.com/search?q=${searchQ}&ibp=htl;jobs&htidocid=${job.job_id}`;
        }

        // Final fallback: Google search for the specific job
        if (!applyUrl) {
          const searchQ = encodeURIComponent(`${job.title} ${job.company_name} apply`);
          applyUrl = `https://www.google.com/search?q=${searchQ}&ibp=htl;jobs`;
        }

        const formattedJob = {
          title: job.title || '',
          company: job.company_name || 'Unknown',
          summary: stripHtml(job.description || '').slice(0, 1000),
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
        await cacheJobs(storeCacheKey, queryJobs, 86400);
      }

      successfulQueries++;

      // Rate limit: 800ms delay (increased for Vercel Pro's 60s timeout)
      await new Promise(r => setTimeout(r, 800));
    } catch (e) {
      failedQueries++;
      console.error(`[SERP] Query "${queryText}" exception:`, e.message);
    }
  }

  console.log(`[SERP] Done: ${successfulQueries}/${items.length} ok, ${failedQueries} failed, ${allJobs.length} jobs (page ${isPage2 ? 2 : 1})`);

  return { jobs: allJobs, nextPageTokens: collectedNextTokens };
}

// ---- Fetch JSearch (RapidAPI) ----
async function fetchJSearch(queries, location, apiKey) {
  if (!apiKey || !queries.length) return [];
  const allJobs = [];

  for (const q of queries.slice(0, 6)) { // Increased from 3 to 6
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
    console.warn('[QUERY_PLANNER] No OPENROUTER_API_KEY — falling back to rule-based buildQueries()');
    return null;
  }

  const skillSummary = [
    ...(profile.skills || []),
    ...(profile.search_terms || []),
  ].slice(0, 20).join(', ');

  const prompt = `You are a job search query optimizer for Google Jobs.
Given this candidate profile, generate 6 search queries that MAXIMIZE job results.

CRITICAL: Google Jobs returns 0 results for overly specific queries.
Keep queries SHORT (2-3 words max). Let the matching engine handle relevance.

STRATEGY — cast a wide net, mix broad and focused:
- Query 1: Their core role title only (e.g. "Game Designer", "Strategy Consultant")
- Query 2: Platform/tool + role (e.g. "Unity Designer", "Salesforce Architect")
- Query 3: Alternative job title for the same role (e.g. "Level Designer", "Business Analyst")
- Query 4: Industry + broad role (e.g. "Fintech Analyst", "Gaming Producer")
- Query 5: Adjacent role they could fill (e.g. "Product Manager", "Systems Designer")
- Query 6: Their top skill + "jobs" (e.g. "Power BI jobs", "Unity jobs")

RULES:
- MAX 3 words per query — shorter is better
- NO compound queries like "Unity Game Designer F2P" — these return 0 results
- At least 2 queries should be broad enough to match 10+ jobs
- Include role title VARIATIONS (different words for the same job)
- Return ONLY valid JSON, no markdown

Candidate:
- Headline: ${profile.headline || 'Unknown'}
- Industry: ${profile.industry || 'Unknown'}
- Experience: ${profile.experience_years || 0} years
- Skills & terms: ${skillSummary}

Respond ONLY with this JSON shape:
{
  "roleAnchor": "...",
  "dominantPlatform": "...",
  "queries": ["...", "...", "...", "...", "...", "..."]
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
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(8000),    // hard cap: 8s, won't block the scan
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

    console.log('[QUERY_PLANNER] LLM queries generated:', parsed);
    return parsed;

  } catch (e) {
    console.warn('[QUERY_PLANNER] LLM call failed, falling back to rule-based:', e.message);
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

    console.log('[QUERY_PLANNER] Using LLM-planned queries:', queries);
    return {
      queries: queries.slice(0, 6),
      location,
      roleAnchor: llmPlan.roleAnchor,
      dominantPlatform: llmPlan.dominantPlatform,
      expandedQueries: queries,
      isRemotePreferred: isRemote,
      source: 'llm',
    };
  }

  // ── Step 2: Fallback — original rule-based logic (my updated advanced ranker) ────────────
  console.log('[QUERY_PLANNER] Using advanced rule-based fallback');
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
    queries: trimmed.slice(0, 6),
    location,
    expandedQueries: trimmed.slice(0, 10),
    isRemotePreferred: isRemote,
    roleAnchor: headline || null,
    dominantPlatform: normalized.dominantPlatform || null,
    source: 'rules'
  };
}

// ---- Main fetch function ----
export async function fetchAllJobs(profile, apiKeys = {}, onProgress, preferences = {}) {
  // Try to use provided keys first, otherwise fallback to process.env (useful for running via node scripts vs Next.js)
  const serpKey = apiKeys.SERP_API_KEY || process.env.SERP_API_KEY;
  const jsearchKey = apiKeys.JSEARCH_KEY || process.env.JSEARCH_KEY;
  const openRouterKey = apiKeys.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;

  const { queries, location, isRemotePreferred, roleAnchor, dominantPlatform, source } = await buildQueries(profile, preferences, openRouterKey);
  console.log(`[QUERY_PLANNER] Query source: ${source} | roleAnchor: ${roleAnchor} | dominantPlatform: ${dominantPlatform}`);

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

  // SerpAPI / JSearch - relaxed threshold due to Production Plan (15k searches/mo)
  // ALWAYS use paid APIs to ensure high-quality localized results
  const shouldUsePaidAPIs = true;
  const isMidasSearch = preferences.midasSearch === true;

  if (queries.length > 0 && shouldUsePaidAPIs) {
    if (process.env.NODE_ENV === 'development') console.log(`[INGESTION_ORCHESTRATOR] Free sources returned ${allJobs.length} jobs. Activating SerpAPI unconditionally.`);
    if (process.env.NODE_ENV === 'development') console.log('[INGESTION_ORCHESTRATOR] SERP_API_KEY present:', !!serpKey);
    if (process.env.NODE_ENV === 'development') console.log('[INGESTION_ORCHESTRATOR] Midas Search:', isMidasSearch);

    // Page 1 — always runs
    onProgress?.(`Querying Google Jobs...`);
    const { jobs: serpJobs, nextPageTokens: serpTokens } = await fetchSerpAPI(queries, location, serpKey);
    allJobs.push(...serpJobs);
    onProgress?.(`+${serpJobs.length} from Google Jobs.`);

    // Auto-broaden: if location-specific search returned <10 jobs, re-run top 3 queries without location
    if (location && serpJobs.length < 10) {
      const broaderQueries = queries.slice(0, 3);
      onProgress?.(`Sparse results (${serpJobs.length}) — broadening search without location...`);
      console.log(`[SERP] Auto-broadening: ${serpJobs.length} jobs with location, retrying ${broaderQueries.length} queries without location`);
      const { jobs: broaderJobs } = await fetchSerpAPI(broaderQueries, null, serpKey);
      allJobs.push(...broaderJobs);
      onProgress?.(`+${broaderJobs.length} from broader search.`);
    }

    if (isMidasSearch && serpTokens.length > 0) {
      // Midas Search: 2x coverage — fetch page 2 using next_page_tokens from page 1
      onProgress?.(`✦ Midas Search: fetching page 2 for deeper coverage...`);
      const { jobs: page2Jobs } = await fetchSerpAPI([], location, serpKey, { nextPageTokens: serpTokens });
      allJobs.push(...page2Jobs);
      onProgress?.(`✦ +${page2Jobs.length} Midas Search results.`);
    }

    const jsearchJobs = await fetchJSearch(queries, location, jsearchKey);
    allJobs.push(...jsearchJobs);
    onProgress?.(`+${jsearchJobs.length} JSearch.`);
  } else {
    if (process.env.NODE_ENV === 'development') console.warn('[INGESTION_ORCHESTRATOR] SerpAPI SKIPPED: No queries generated');
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
  return { jobs: unique, sources, queries, roleAnchor, dominantPlatform, source };
}
