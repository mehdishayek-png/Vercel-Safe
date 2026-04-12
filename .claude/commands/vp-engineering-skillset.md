# MIDAS MATCH — VP ENGINEERING SKILLSET
### For use by: Platform Agent, Pipeline Agent, AI/Matching Agent, Frontend Agent
### Document version: 2026-04-04 | Produced from live codebase read

---

## 1. CODEBASE MAP

All paths verified to exist at time of research.

### `/lib/` — Core Library Layer

| File | What it does |
|---|---|
| `lib/panda-matcher.js` | Primary scoring engine. `calculatePandaScore(job, profile, preferences, apiKeys)` is the only public export. ~1100 lines. |
| `lib/scoring-config.js` | All scoring weights. Single `SCORING_CONFIG` export. Every numeric weight in the engine references this. |
| `lib/job-fetcher.js` | Orchestrator that fetches from all sources, normalizes, deduplicates. Exports `fetchAllJobsStreaming`. |
| `lib/sources/registry.js` | `SOURCE_REGISTRY` array (30 sources). `getActiveSources()`, `getSourcesByPhase()`. Source plugin manifest. |
| `lib/circuit-breaker.js` | Per-source in-memory circuit breaker. `withCircuitBreaker(name, fn, opts)`. 3 failures → 60s cooldown. |
| `lib/tokens.js` | Token economy: `canScan`, `deductToken`, `creditTokens`, `getTokenBalance`, scan counters. All Redis-backed. |
| `lib/cache.js` | Job cache on Redis. `getCachedJobs`, `cacheJobs`, `slimJobsForCache`. 1h TTL. 900KB payload cap. |
| `lib/sonnet.js` | LLM wrapper. `callSonnet` (routes to Flash), `callFlash`, `parseJSON`. Both call `google/gemini-2.5-flash` via OpenRouter. |
| `lib/redis.js` | Redis singleton. Module-level `_instance`. Import `{ redis }` — never instantiate directly. |
| `lib/rate-limit.js` | Sliding-window rate limiter on Redis. `rateLimit(id, max, windowSec)`. Fails open if Redis is down. |
| `lib/feature-flags.js` | Two-tier flag system: env vars + Redis overrides. `getFeatureFlags()`, `getFlag(key)`, `getClientFeatureFlags()`. |
| `lib/logger.js` | `log`, `warn`, `error` — thin wrappers over console. Always emit (not gated on NODE_ENV). |
| `lib/embeddings.js` | `computeSemanticMatch` — imported by panda-matcher but explicitly disabled during live scan (line 982). Used in cron pipeline only. |
| `lib/skill-normalizer.js` | `normalizeSkillsForSearch`, `rankSkillsForSearch` — imported by job-fetcher. |
| `lib/ats-fetcher.js` | `fetchATSJobs` — fetches from company ATS systems directly. |
| `lib/pre-filter.js` | Pre-scoring filter logic. |
| `lib/matcher.js` | Legacy/alternative matcher (distinct from panda-matcher). |
| `lib/filters.js` | Filter UI config, `DEFAULT_FEATURE_FLAGS` definition. |

### `/lib/sources/`
| File | What it does |
|---|---|
| `lib/sources/registry.js` | Sole source-of-truth for all 30 job sources. Contains `SOURCE_REGISTRY`, `getActiveSources`, `getSourcesByPhase`. |

### `/app/api/` — Route Handlers

| Route | `maxDuration` | Notes |
|---|---|---|
| `app/api/match-jobs-stream/route.js` | 90s | SSE stream endpoint. Auth → rate-limit → canScan → deductToken → stream jobs + scores. |
| `app/api/match-jobs/route.js` | unknown | Non-streaming variant. |
| `app/api/analyze-job/route.js` | 30s | Deep scan per job. Uses `callSonnet` (routes to Flash). 5 free deep scans, then 1 token. |
| `app/api/career-insights/route.js` | unknown | LLM-based. |
| `app/api/salary-negotiation/route.js` | unknown | LLM-based. |
| `app/api/cover-letter/route.js` | unknown | LLM-based. |
| `app/api/interview-prep/route.js` | unknown | LLM-based. |
| `app/api/resume-gaps/route.js` | unknown | LLM-based. |
| `app/api/parse-resume/route.js` | unknown | Uses `pdf-parse`. |
| `app/api/tokens/route.js` | unknown | Token management. Razorpay integration. |
| `app/api/razorpay/route.js` | unknown | Payment webhook. |
| `app/api/cron/route.js` | unknown | Cron job runner. Embeddings used here. |
| `app/api/admin/route.js` | unknown | Admin panel endpoints. |

---

## 2. CORE CONSTRAINTS

**C1 — Vercel Function Timeout**
`match-jobs-stream` is `maxDuration = 90`. All `fetch` calls use `AbortSignal.timeout(25000)`. Do not remove timeouts.

**C2 — Redis Singleton**
Import `{ redis }` from `./redis.js`. Never call `new Redis(...)`. Always null-check: `if (!redis || !userId) return <safe_default>`.

**C3 — Token Atomicity**
`deductToken` uses a Lua script for atomic check-and-deduct. Never replace with GET + DECR two-step (race condition → double-spend).

**C4 — SSE Contract**
Stream emits: `data: <JSON>\n\n`. Three types: `{ type: 'progress', message }`, `{ type: 'jobs', source, jobs, total }`, `{ type: 'done', ... }`. Do not change wire format.

**C5 — Redis Cache Payload Limit**
Payloads >900KB silently skipped. `slimJobsForCache` strips non-essential fields and truncates strings at 500 chars. Never store full summaries in cache.

**C6 — Scoring Config is Single Source of Truth**
All numeric weights in `calculatePandaScore` must reference `SCORING_CONFIG`. No inline magic numbers except `effectiveDivisor` thresholds (known gap, extract to config eventually).

**C7 — LLM Timeout**
`callFlash` uses `AbortSignal.timeout(25000)`. Intentional — Flash P50 on long prompts can hit 15-20s.

**C8 — Anonymous Users Blocked**
`canScan` with `userId = null` returns `{ allowed: false, error: 'Sign in to use Midas Match.', requiresAuth: true }`. All scans require authentication.

---

## 3. SHARED PATTERNS

- **Error handling:** Redis consumers return safe defaults on failure. Rate limiter fails open. Token deduction fails closed.
- **Null-safe Redis:** `if (!redis || !userId) return <safe_default>`
- **Import paths:** App layer uses `@/lib/...`. Lib files use relative paths (`./redis.js`).
- **Module exports:** Named ESM exports only. No default exports in lib.
- **Logging:** `lib/logger.js` in lib files. Route files use `console.log(JSON.stringify({ event, ... }))`.
- **Fetch pattern:** All external fetches use `AbortSignal.timeout(N)`. Check `if (!res.ok) return []` before parsing.
- **Config extraction:** Numbers → `scoring-config.js` (scoring) or named constants at top of file.
- **Zod validation:** Route handlers use `z.safeParse()`. Failures return `status: 400, { error, details }`.

---

## 4. AGENT BOUNDARIES

### Platform Agent
**Owns:** `lib/redis.js`, `lib/tokens.js`, `lib/rate-limit.js`, `lib/cache.js`, `lib/feature-flags.js`, `lib/circuit-breaker.js`, `app/api/tokens/`, `app/api/razorpay/`, `app/api/admin/`
**Must NOT touch:** Scoring weights, source registry entries, LLM prompts, SSE frame format.
**Critical:** Token Lua script is atomic — do not change. Redis singleton must not be duplicated.

### Pipeline Agent
**Owns:** `lib/job-fetcher.js`, `lib/sources/registry.js`, `lib/ats-fetcher.js`, `lib/skill-normalizer.js`, `lib/pre-filter.js`, all source fetch functions.
**Must NOT touch:** `calculatePandaScore` internals, `SCORING_CONFIG` weights, SSE encoding, Redis singleton.
**Critical:** New sources via `SOURCE_REGISTRY` only. All fetchers return `[]` on failure. Wrap with `withCircuitBreaker`.

### AI/Matching Agent
**Owns:** `lib/panda-matcher.js`, `lib/scoring-config.js`, `lib/sonnet.js`, `lib/embeddings.js`, `lib/matcher.js`, all LLM API routes.
**Must NOT touch:** Token deduction, source registry, SSE encoding, cache payload structure.
**Critical:** `calculatePandaScore` is async — keep it async. All weight changes go through `scoring-config.js`. Return shape is a contract (see Section 6).

### Frontend Agent
**Owns:** `app/` pages and components (non-API), `lib/safe-render.js`, `lib/safe-btoa.js`, `lib/match-colors.js`, `lib/export-csv.js`, Zustand stores, UI state.
**Must NOT touch:** Any `lib/` server-side file, API route handlers, scoring logic, Redis.
**Critical:** SSE consumer must handle all three event types without crashing on unknown types. Use `getClientFeatureFlags()` (sync, env-only) from client components — never `getFeatureFlags()` (async, Redis).

---

## 5. KNOWN LANDMINES

**L1 — `effectiveDivisor` inline numbers (panda-matcher.js ~line 1007)**
Values `35` and `48` are hardcoded. If `baseNormDivisor` is tuned, these thresholds may produce inconsistent steps. Extract to config before any divisor tuning.

**L2 — `titleAffinity.maxBonus` optional chaining (panda-matcher.js ~line 995)**
`SCORING_CONFIG.titleAffinity?.maxBonus || 30` — if key is deleted from config, scoring silently uses 30. Hidden coupling.

**L3 — Circuit breaker is in-memory**
`const circuits = new Map()` — per-process only. Vercel cold starts reset all circuit state. No cross-invocation protection.

**L4 — `callSonnet` silently routes to Flash**
Any code importing `callSonnet` expecting Sonnet quality gets Flash. If Sonnet is needed, create a new function with explicit model selection.

**L5 — Scraper sources are fragile**
`Weekday`, `Apna`, `Instahyre`, `Cutshort` are `type: 'scraper'` and depend on third-party internal endpoints. Always circuit-breaker-wrapped. Always return `[]` on failure.

**L6 — `DOMAIN_ACRONYMS` is a subset of `AMBIGUOUS_ACRONYMS` logic**
`DOMAIN_ACRONYMS` half-buff only fires if skill is NOT in `AMBIGUOUS_ACRONYMS`. Verify before adding to either set — a skill in both gets zero buff, not half.

**L7 — Semantic embedding is wired but disabled (panda-matcher.js ~line 982)**
`semanticMultiplier = 1.0` hardcoded. Import at line 7 is live but call is dead. Do not delete the import.

**L8 — `simplyhired.com` appears in both blocklist and as RSS feed**
`AGGREGATOR_DOMAINS` blocks SimplyHired apply URLs. `SIMPLYHIRED_FEED` uses their RSS for job content. This is intentional — do not "fix" it.

---

## 6. SCORING ENGINE CONTRACT

**Function signature:**
```js
export async function calculatePandaScore(job, profile, preferences = {}, apiKeys = {})
```

**Required `job` fields:** `title`, `summary`, `company`, `location`, `date_posted`
**Required `profile` fields:** `headline`, `skills` (string[]), `experience_years`
**`preferences` fields:** `city`, `state`, `country` (ISO or name), `location`, `exploreAdjacent` (boolean)

**Return shape:**
```js
{
  score: number,              // 0-100, final rounded score
  raw: number,                // raw keyword score before normalization
  locationMultiplier: float,
  multipliers: {
    seniority, recency, prestige, location, quality,
    depth, roleFamily, negative, coherence, domain,
    domainDetail,             // 'match' | 'mismatch' | 'undetected'
    semantic,                 // always '1.00'
  },
  matches: [{ skill: string, value: number }]
}
```

**Multiplier application order:**
`(keywordScore / effectiveDivisor) * 100` × seniority × recency × prestige × language × location × depth × roleFamily × negative × coherence × domain × semantic

**Hard caps (post-multiplication):**
| Condition | Cap |
|---|---|
| negative ≤ 0.01 | 5 |
| domain = 'mismatch' | 25 (40 explore) |
| roleFamily ≤ 0.4 (cross-family) | 35 standard; 55 if domain overlaps AND 4+ skills matched |
| roleFamily ≤ 0.65 (unclassified) | 40 standard; 50 if domain overlaps AND 4+ skills matched |
| roleFamily ≤ 0.75 (explore cross-family) | 75 |
| seniority ≤ 0.1 | 30 |
| absolute max | 100 |

**What lives where:**
- `scoring-config.js`: All numeric weights, caps, decay rates, thresholds, buff/penalty scalars
- `panda-matcher.js`: Lists/maps (`NEGATIVE_KEYWORDS`, `PRESTIGIOUS_COMPANIES`, `DEPTH_INDICATORS`, `ROLE_FAMILIES`, `DOMAIN_CLUSTERS`, `CITY_ALIASES`, `SKILL_SYNONYMS`, `AMBIGUOUS_ACRONYMS`, `DOMAIN_ACRONYMS`), scoring algorithm logic

---

## 7. SOURCE PLUGIN CONTRACT

**To add a new source** — add to `SOURCE_REGISTRY` in `lib/sources/registry.js`:
```js
{
  name: string,           // display name + circuit breaker key
  cacheId: string,        // short unique ID for cache key prefix
  type: 'api' | 'rss' | 'scraper' | 'ats',
  enabled: boolean,
  remoteOnly: boolean,
  midasOnly: boolean,
  querySlice: number,     // 0 = no queries needed
  needsLocation: boolean,
  apiKeyEnvs: string[],   // source skipped if any key is absent
  makeFetcher: (ctx) => () => Promise<Job[]>
}
```

**Required `Job` fields:** `title`, `company`, `location`, `apply_url`, `source`, `date_posted`, `summary`

**Rules:**
- Fetcher must return `[]` on failure, never throw
- All external fetches use `AbortSignal.timeout(NETWORK_TIMEOUT)`
- Wrap with `withCircuitBreaker(name, fn)`
- To disable: set `enabled: false`, never delete the entry
- API-key-gated sources: use `apiKeyEnvs` — no conditional code in fetcher

---

## 8. LLM COST RULES

**Current model reality:**
- `callSonnet()` → `callFlash()` (permanent alias, Sonnet caused Vercel 504s)
- Only model in use: `google/gemini-2.5-flash` via OpenRouter
- Live scan scoring: zero LLM calls (panda-matcher is pure JS)

**Cost guardrails:**
- `maxTokens = 800` default. Do not raise without product decision.
- `temperature = 0.7` default. Lower for structured JSON.
- `HTTP-Referer` and `X-Title` headers required on every OpenRouter call. Do not remove.
- Embeddings during live scan: **prohibited** (90+ API calls per scan).
- Sonnet for concurrent calls: **prohibited** (504 timeouts verified experimentally).

**Route LLM usage:**
| Route | Actual model | Cost gate |
|---|---|---|
| `/api/analyze-job` | Gemini 2.5 Flash | 5 free, then 1 token/call |
| All other LLM routes | Gemini 2.5 Flash | Unknown gating |
| Live scoring | None | No cost |
| Cron/embeddings | Unknown | Cron-only |

---

## 9. TESTING CHECKLIST

Run after any scoring change. Call `calculatePandaScore(job, profile, preferences)` directly.

**TC-1: Exact role + exact city → score ≥ 70**
- Profile: `{ headline: "Customer Success Manager", skills: ["Salesforce", "Gainsight", "Zendesk", "churn", "NPS"], experience_years: 5 }`
- Prefs: `{ city: "bangalore", country: "IN" }`
- Job: `{ title: "Customer Success Manager", summary: "Salesforce Gainsight Zendesk churn NPS renewal", location: "Bangalore", company: "Freshworks", date_posted: <today> }`
- Assert: `score >= 70`, `locationMultiplier = 1.5`, `domainDetail = 'match'`

**TC-2: Cross-family BPO kill → score ≤ 15**
- Profile: `{ headline: "Software Engineer", skills: ["Python", "AWS", "Docker", "Kubernetes", "React"], experience_years: 4 }`
- Prefs: `{ city: "mumbai", country: "IN" }`
- Job: `{ title: "Customer Care Executive", summary: "answering calls BPO inbound calls telecaller voice process", location: "Mumbai", company: "Accenture", date_posted: <today> }`
- Assert: `score <= 15`, `depth multiplier = 0.60`

**TC-3: Seniority gap kill → score ≤ 30**
- Profile: `{ headline: "Junior Developer", skills: ["JavaScript", "React", "HTML"], experience_years: 1 }`
- Prefs: `{ country: "US" }`
- Job: `{ title: "Principal Software Architect", summary: "JavaScript React Node.js microservices leadership", location: "Remote", company: "Stripe", date_posted: <today> }`
- Assert: `score <= 30`, seniority hard cap fires

**TC-4: Niche role, no title overlap, strong skills → score ≥ 55**
- Profile: `{ headline: "IAM Security Engineer", skills: ["Okta", "SAML", "SSO", "OAuth", "SCIM", "Azure AD"], experience_years: 6 }`
- Prefs: `{ country: "US" }`
- Job: `{ title: "Identity Platform Engineer", summary: "Okta SAML SSO OAuth SCIM Azure AD identity governance", location: "Remote", company: "Cloudflare", date_posted: <today> }`
- Assert: `score >= 55`, techAcronymBuff fires on Okta/SAML/SSO/SCIM

**TC-5: Wrong country kill → score ≤ 5**
- Profile: `{ headline: "Product Manager", skills: ["Jira", "roadmap", "A/B testing", "Mixpanel"], experience_years: 4 }`
- Prefs: `{ city: "london", country: "GB" }`
- Job: `{ title: "Product Manager", summary: "Jira roadmap A/B testing Mixpanel product strategy", location: "Bangalore, India", company: "Infosys", date_posted: <today> }`
- Assert: `score <= 5`, `locationMultiplier = 0.01`

**Debugging steps:**
1. Inspect `result.multipliers` to find the unexpected multiplier
2. Inspect `result.matches` to verify which skills matched and their point values
3. If high score on mismatch: check `domainDetail`, `roleFamily` multiplier, zero-overlap cap

---

## 10. RED LINES

**RL-1 — SerpAPI: Removed. Do not re-add.** Cost was prohibitive.

**RL-2 — Semantic embeddings during live scan: Forbidden.** 90+ OpenAI calls per scan. Cron pipeline only.

**RL-3 — Sonnet for concurrent calls: Forbidden.** Verified experimentally — causes Vercel 504s. `callSonnet` = `callFlash` permanently.

**RL-4 — Two-step token deduction: Forbidden.** GET + DECR race condition allows double-spend. Lua script only.

**RL-5 — Hardcoded source calls in orchestrator: Forbidden.** All sources via `SOURCE_REGISTRY`. Bypasses enabled/remoteOnly/apiKeyEnvs/circuit-breaker gating.

**RL-6 — crossFamilyCap below 30: Tried at 20, reverted.** Crushed legitimate adjacent-role matches. Do not lower below 30 without running TC-4.

**RL-7 — unclassifiedCap below 35: Tried at 25, reverted.** Killed niche roles that couldn't be classified. Do not lower below 35 without running TC-4.

**RL-8 — `redis.scan` in hot paths: Avoid.** Admin flush only. Scan-based enumeration in request paths causes Redis latency spikes.

**RL-9 — Deleting `enabled: false` registry entries: Forbidden.** Disabled sources have working implementations. `enabled: true` is the only change needed to reactivate.

---

*All content derived from live codebase read at `C:\Users\D\Vercel-Safe` on 2026-04-04.*
