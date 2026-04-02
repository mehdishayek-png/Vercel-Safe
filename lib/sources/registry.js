// Source plugin registry — single source of truth for all job sources.
// Each entry describes a source's behavior. The orchestrator loops over this
// instead of hardcoding 26 source calls.
//
// To add a new source: add an entry here + create its fetch function.
// To disable a source: set enabled: false.

/**
 * @typedef {Object} SourceConfig
 * @property {string} name - Display name (e.g., 'Serper')
 * @property {string} cacheId - Short cache identifier
 * @property {'api'|'rss'|'scraper'|'ats'} type
 * @property {boolean} enabled
 * @property {boolean} remoteOnly - Only fetch when user prefers remote
 * @property {boolean} midasOnly - Only fetch during Midas Search
 * @property {number} querySlice - Max queries to pass (0 = no queries needed)
 * @property {number} [midasQuerySlice] - Override querySlice during Midas Search
 * @property {boolean} needsLocation - Pass location to fetch function
 * @property {string[]} [apiKeyEnvs] - Env var names needed (source skipped if none available)
 * @property {Function} makeFetcher - (ctx) => () => Promise<Job[]>
 */

// Context object passed to makeFetcher:
// { queries, location, apiKeys, resolvedKeys, preferences, profile, activeQueries }

export const SOURCE_REGISTRY = [
    // ---- RSS sources (remote-only) ----
    {
        name: 'RemoteOK', cacheId: 'remoteok', type: 'rss', enabled: true,
        remoteOnly: true, midasOnly: false, querySlice: 0, needsLocation: false,
        makeFetcher: (ctx) => () => ctx._fetchRSS(ctx._REMOTEOK_FEED, 'RemoteOK', 100),
    },
    {
        name: 'Jobicy (RSS)', cacheId: 'jobicy-rss', type: 'rss', enabled: true,
        remoteOnly: true, midasOnly: false, querySlice: 0, needsLocation: false,
        makeFetcher: (ctx) => () => ctx._fetchRSS(ctx._JOBICY_FEED, 'Jobicy'),
    },
    {
        name: 'Remotive', cacheId: 'remotive', type: 'rss', enabled: true,
        remoteOnly: true, midasOnly: false, querySlice: 0, needsLocation: false,
        makeFetcher: (ctx) => () => ctx._fetchRemotive(),
    },
    {
        name: 'SimplyHired', cacheId: 'simplyhired', type: 'rss', enabled: true,
        remoteOnly: true, midasOnly: false, querySlice: 0, needsLocation: false,
        makeFetcher: (ctx) => () => ctx._fetchRSS(ctx._SIMPLYHIRED_FEED, 'SimplyHired', 50),
    },

    // ---- API sources ----
    {
        name: 'Serper', cacheId: 'serper', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 5, needsLocation: true,
        apiKeyEnvs: ['SERPER_API_KEY'],
        makeFetcher: (ctx) => () => ctx._fetchSerper(ctx.activeQueries.slice(0, 5), ctx.location, ctx.resolvedKeys.SERPER_API_KEY),
    },
    {
        name: 'Adzuna', cacheId: 'adzuna', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 0, needsLocation: true,
        apiKeyEnvs: ['ADZUNA_APP_ID', 'ADZUNA_APP_KEY'],
        makeFetcher: (ctx) => () => ctx._fetchAdzuna(ctx.activeQueries, ctx.adzunaLocation, ctx.adzunaCountry, ctx.resolvedKeys.ADZUNA_APP_ID, ctx.resolvedKeys.ADZUNA_APP_KEY),
    },
    {
        name: 'JSearch', cacheId: 'jsearch', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 3, midasQuerySlice: 5, needsLocation: true,
        apiKeyEnvs: ['JSEARCH_KEY'],
        makeFetcher: (ctx) => {
            const slice = ctx.isMidasSearch ? 5 : 3;
            return () => ctx._fetchJSearch(ctx.activeQueries.slice(0, slice), ctx.location, ctx.resolvedKeys.JSEARCH_KEY);
        },
    },
    {
        name: 'LinkedIn', cacheId: 'linkedin', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 4, needsLocation: true,
        apiKeyEnvs: ['LINKEDIN_API_KEY'],
        makeFetcher: (ctx) => () => ctx._fetchLinkedIn(ctx.activeQueries.slice(0, 4), ctx.location, ctx.resolvedKeys.LINKEDIN_API_KEY),
    },
    {
        name: 'Arbeitnow', cacheId: 'arbeitnow', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 0, needsLocation: false,
        makeFetcher: (ctx) => () => ctx._fetchArbeitnow(),
    },
    {
        name: 'The Muse', cacheId: 'muse', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 2, needsLocation: false,
        makeFetcher: (ctx) => () => ctx._fetchTheMuse(ctx.activeQueries.slice(0, 2)),
    },
    {
        name: 'Himalayas', cacheId: 'himalayas', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 0, needsLocation: false,
        makeFetcher: (ctx) => () => ctx._fetchHimalayas(),
    },
    {
        name: 'Jobicy', cacheId: 'jobicy', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 0, needsLocation: false,
        makeFetcher: (ctx) => () => ctx._fetchJobicy(),
    },
    {
        name: 'Findwork', cacheId: 'findwork', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 0, needsLocation: false,
        apiKeyEnvs: ['FINDWORK_API_KEY'],
        makeFetcher: (ctx) => () => ctx._fetchFindwork(ctx.resolvedKeys.FINDWORK_API_KEY),
    },
    {
        name: 'USAJOBS', cacheId: 'usajobs', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 3, needsLocation: false,
        apiKeyEnvs: ['USAJOBS_API_KEY'],
        makeFetcher: (ctx) => () => ctx._fetchUSAJobs(ctx.activeQueries.slice(0, 3), ctx.resolvedKeys.USAJOBS_API_KEY),
    },
    {
        name: 'WeWorkRemotely', cacheId: 'wwr', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 0, needsLocation: false,
        makeFetcher: (ctx) => () => ctx._fetchWeWorkRemotely(),
    },
    {
        name: 'Jooble', cacheId: 'jooble', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 3, needsLocation: true,
        apiKeyEnvs: ['JOOBLE_API_KEY'],
        makeFetcher: (ctx) => () => ctx._fetchJooble(ctx.activeQueries.slice(0, 3), ctx.location, ctx.resolvedKeys.JOOBLE_API_KEY),
    },
    {
        name: 'Reed', cacheId: 'reed', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 3, needsLocation: false,
        apiKeyEnvs: ['REED_API_KEY'],
        makeFetcher: (ctx) => () => ctx._fetchReed(ctx.activeQueries.slice(0, 3), ctx.resolvedKeys.REED_API_KEY),
    },
    {
        name: 'DevITjobs', cacheId: 'devit', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 0, needsLocation: false,
        makeFetcher: (ctx) => () => ctx._fetchDevITjobs(),
    },
    {
        name: 'LinkedIn (Fantastic)', cacheId: 'linkedin-search', type: 'api', enabled: false,
        remoteOnly: false, midasOnly: false, querySlice: 3, needsLocation: true,
        apiKeyEnvs: ['JSEARCH_KEY'],
        makeFetcher: (ctx) => () => ctx._fetchLinkedInJobSearch(ctx.activeQueries.slice(0, 3), ctx.location, ctx.resolvedKeys.JSEARCH_KEY),
    },
    {
        name: 'ActiveJobsDB', cacheId: 'activejobsdb', type: 'api', enabled: false,
        remoteOnly: false, midasOnly: false, querySlice: 3, needsLocation: true,
        apiKeyEnvs: ['JSEARCH_KEY'],
        makeFetcher: (ctx) => () => ctx._fetchActiveJobsDB(ctx.activeQueries.slice(0, 3), ctx.location, ctx.resolvedKeys.JSEARCH_KEY),
    },
    {
        name: 'Indeed', cacheId: 'indeed', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 3, needsLocation: true,
        apiKeyEnvs: ['JSEARCH_KEY'],
        makeFetcher: (ctx) => () => ctx._fetchIndeedViaJobsAPI(ctx.activeQueries.slice(0, 3), ctx.location, ctx.adzunaCountry, ctx.resolvedKeys.JSEARCH_KEY),
    },
    {
        name: 'Bing Jobs', cacheId: 'bing', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 3, needsLocation: true,
        apiKeyEnvs: ['JSEARCH_KEY'],
        makeFetcher: (ctx) => () => ctx._fetchBingJobs(ctx.activeQueries.slice(0, 3), ctx.location, ctx.resolvedKeys.JSEARCH_KEY),
    },
    {
        name: 'Apify', cacheId: 'apify', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 0, needsLocation: true,
        makeFetcher: (ctx) => () => ctx._fetchApifyAllJobs(ctx.activeQueries, ctx.location),
    },
    {
        name: 'Naukri', cacheId: 'naukri', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 0, needsLocation: false,
        makeFetcher: (ctx) => () => ctx._fetchApifyNaukri(ctx.activeQueries),
    },
    {
        name: 'Direct (ATS)', cacheId: 'ats', type: 'ats', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 0, needsLocation: true,
        makeFetcher: (ctx) => () => ctx._fetchATSJobs(ctx.activeQueries, ctx.location, ctx.profile),
    },

    // ---- Scraper sources (fragile) ----
    {
        name: 'Weekday', cacheId: 'weekday', type: 'scraper', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 1, needsLocation: true,
        makeFetcher: (ctx) => () => ctx._fetchWeekday(ctx.activeQueries.slice(0, 1), ctx.location),
    },
    {
        name: 'Apna', cacheId: 'apna', type: 'scraper', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 1, needsLocation: true,
        makeFetcher: (ctx) => () => ctx._fetchApna(ctx.activeQueries.slice(0, 1), ctx.location),
    },
    {
        name: 'Instahyre', cacheId: 'instahyre', type: 'scraper', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 0, needsLocation: true,
        makeFetcher: (ctx) => () => ctx._fetchInstahyre(ctx.activeQueries, ctx.location),
    },
    {
        name: 'Cutshort', cacheId: 'cutshort', type: 'scraper', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 0, needsLocation: true,
        makeFetcher: (ctx) => () => ctx._fetchCutshort(ctx.activeQueries, ctx.location),
    },
    {
        name: 'HN Hiring', cacheId: 'hn', type: 'api', enabled: true,
        remoteOnly: false, midasOnly: false, querySlice: 0, needsLocation: false,
        makeFetcher: (ctx) => () => ctx._fetchHNWhoIsHiring(),
    },
];

/**
 * Get enabled sources filtered by context.
 * @param {Object} opts - { isRemotePreferred, isMidasSearch }
 * @returns {SourceConfig[]}
 */
export function getActiveSources({ isRemotePreferred = false, isMidasSearch = false } = {}) {
    return SOURCE_REGISTRY.filter(s => {
        if (!s.enabled) return false;
        if (s.remoteOnly && !isRemotePreferred) return false;
        if (s.midasOnly && !isMidasSearch) return false;
        return true;
    });
}

/**
 * Get sources grouped by phase for the orchestrator.
 */
export function getSourcesByPhase(opts) {
    const active = getActiveSources(opts);
    return {
        rss: active.filter(s => s.type === 'rss'),
        api: active.filter(s => s.type !== 'rss'),
    };
}
