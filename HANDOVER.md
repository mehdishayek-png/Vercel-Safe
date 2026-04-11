# Midas Match — Engineering Handover

> Last updated: 2026-04-09. Written from accumulated session memory + live codebase inspection.

---

## 1. What This Is

**Midas Match** is an AI-powered job matching platform. Users upload a CV, the system extracts their profile, fans out across 20+ live job sources in real time, scores every result with a heuristic engine (Panda Matcher), and surfaces the best matches in a scored, ranked list. A deep-analysis layer (Claude Sonnet) then runs on the top results to produce fit verdicts, salary estimates, and interview prep.

**Repo:** `C:\Users\D\Vercel-Safe` / GitHub: `mehdishayek-png/Vercel-Safe`
**Production:** Auto-deploys from `main` → Vercel project `jobbot-vercel` (`prj_Mndm9BFUbKNSOa3qv16CTCGqXpzI`)
**Live URL:** managed by Vercel (check `NEXT_PUBLIC_APP_URL` in env)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Auth | Clerk |
| State | Zustand (4 stores: profile, search, jobs, token) |
| Cache / Rate-limiting | Upstash Redis (singleton in `lib/redis.js`) |
| Payments | Razorpay (INR) |
| AI — Deep analysis | Claude Sonnet 4 via OpenRouter (`lib/sonnet.js`) |
| AI — Resume parse | Gemini Flash via OpenRouter |
| AI — Cheap endpoints | Gemini Flash (interview prep, cover letter, career insights, resume gaps) |
| Embeddings | OpenAI `text-embedding-3-small` — **disabled in live scan** (latency/cost) |
| Deployment | Vercel (serverless functions, SSE streaming) |
| Local dev | Windows 10, `C:\Users\D\Vercel-Safe`, Node 20 |

**Design system:** Coral (`#ff7e67`) + warm gold (`#fbbf24`). Fonts: Plus Jakarta Sans (headlines) + Inter (body). Glass panels, warm cream surfaces, dark mode supported.

---

## 3. Architecture

```
Client (Next.js App Router)
  ├── Landing page (/) — static
  └── /dashboard
      ├── AppContext (thin initializer) → 4 Zustand stores
      ├── /search         — CV upload, profile, scan controls, results grid
      ├── /job/[id]       — deep analysis, scoring breakdown, cover letter, similar jobs
      ├── /saved          — saved jobs (localStorage + Redis sync)
      ├── /applications   — applied jobs (localStorage)
      ├── /prep           — interview prep (LLM)
      └── /settings       — profile + preferences

API Routes
  ├── /api/match-jobs-stream   SSE — orchestrates all sources → Panda score → stream to client
  ├── /api/analyze-job         Claude Sonnet deep analysis (fit score, salary, gaps, verdict)
  ├── /api/parse-resume        Gemini Flash PDF → skills/headline/experience
  ├── /api/interview-prep      Gemini Flash
  ├── /api/cover-letter        Gemini Flash
  ├── /api/career-insights     Gemini Flash (downgraded from Sonnet)
  ├── /api/resume-gaps         Gemini Flash (downgraded from Sonnet)
  ├── /api/salary-negotiation  Claude Sonnet
  ├── /api/tokens              Upstash Redis token management
  ├── /api/saved-jobs          Upstash Redis
  ├── /api/feedback            POST: track clicks/saves/applies; GET: admin stats
  ├── /api/log-error           Client crash reporting → [CLIENT CRASH] tag in Vercel logs
  └── /api/admin/              credit, flags, flush-cache, circuits

Lib (key files)
  ├── job-fetcher.js          Registry-driven orchestrator — fans out to all sources via SSE
  ├── sources/registry.js     Source plugin configs (type, apiKeyEnvs, querySlice)
  ├── sources/linkedin-guest.js    LinkedIn no-auth scraper (25 results/page, metro geoIds)
  ├── sources/workday-public.js    Workday direct API (713 verified tenants)
  ├── panda-matcher.js        Heuristic scoring engine — 10 multipliers, 48 domain clusters
  ├── scoring-config.js       All tunable weights (extracted from panda-matcher, ~130 lines)
  ├── ats-fetcher.js          Greenhouse / Lever / Ashby direct (1976 boards)
  ├── ghost-detector.js       Ghost job detection (posting age, quality, reposting signals)
  ├── jd-quality.js           JD quality scorer (biased language, boilerplate, readability)
  ├── salary-predictor.js     Salary estimation from JD text
  ├── success-predictor.js    Application success probability
  ├── feedback-tracker.js     User interaction tracking → Redis
  ├── circuit-breaker.js      Per-source failure tracking + auto-disable
  ├── tokens.js               Billing, Lua scripts for atomicity, free tier (5 scans/day)
  ├── cache.js                Redis get/set with 900KB guard + 30min per-source cache
  ├── redis.js                Singleton Upstash client
  ├── sonnet.js               Claude wrapper with Gemini Flash fallback (callFlash())
  ├── embeddings.js           OpenAI embeddings — currently disabled
  ├── safe-render.js          safe() guard for all LLM output rendering (prevents React #31 crash)
  └── safe-btoa.js            UTF-8 safe base64

Test suite
  ├── test/multi-profile-test.mjs   24 synthetic cases across 5 profiles — run to verify scoring
  ├── test/profile-scan.mjs          Real fetch against live sources for a named profile
  ├── test/scan-diagnostic.mjs       Local pipeline tester (no LLM, fast)
  ├── test/scoring-audit-verify.mjs  8 audit test cases — all must pass
  └── test/feature-engines.mjs       31 assertions for intelligence engines

Scripts
  ├── scripts/fetch-scan-logs.mjs    Pull + parse live Vercel scan logs (use --since=1h)
  └── scripts/pull-match-logs.mjs    Drain in-memory ring buffer → local JSONL
```

---

## 4. Job Sources

### Currently Active in Production

| Source | Method | Notes |
|---|---|---|
| LinkedIn Guest | No-auth scraper | 25 results/page, title-only (no descriptions). 429 under Vercel IPs — needs ScraperAPI fallback. |
| Workday Direct | No-auth POST API | 713 verified tenants. 58+ jobs per scan. Post-filter by title relevance. |
| ATS (Greenhouse/Lever/Ashby) | Direct API | 1976 boards. US-HQ companies — India coverage thin. |
| Google Jobs (DataForSEO) | Paid API ($50 deposit) | Task-post + poll model. city:bengaluru = location_code 1007768. No description field in results. |
| Adzuna | Paid API | Low hit rate, functional. |
| Weekday | Scraper | Functional but fragile. |
| Apna | Scraper | Functional but fragile. |
| Instahyre / Naukri / Foundit | Scraper | Timing out or blocked — not reliable. |
| Himalayas, Jobicy, RemoteOK, Remotive, Arbeitnow, The Muse | Free APIs | Remote-focused, lower India relevance. |

### Source Architecture
- All sources registered in `lib/sources/registry.js`
- Orchestrated by `fetchAllJobsStreaming()` in `lib/job-fetcher.js`
- Callback pattern: `onSourceComplete(sourceName, jobs)` + `onProgress(msg)` — NOT async generator
- Circuit breaker (`lib/circuit-breaker.js`) auto-disables failing sources
- Per-source Redis cache (30min TTL) prevents redundant fetches

---

## 5. Panda Scorer (Matching Engine)

**File:** `lib/panda-matcher.js` (~1000 lines) + `lib/scoring-config.js` (all weights)

### How It Works

1. **Keyword score** — Skills matched against job text. Scored by: base value + length + caps + tech acronym buff + niche tool buff. Ubiquity-weighted (IDF principle — domain-exclusive terms score higher).
2. **Normalize** — Divide by `baseNormDivisor` (50) → 0-100 base.
3. **Title affinity** — Up to +12 points for title overlap (post-normalization).
4. **10 multipliers applied** in sequence:
   - `seniority` — years experience vs job level expected (intern/mid/senior/manager)
   - `location` — exact city (1.5×), same state (1.3×), remote same country (1.1×), wrong country (0.01×)
   - `recency` — fresh posts buffed, older posts decayed
   - `prestige` — known companies buffed
   - `depth` — shallow support roles penalized
   - `roleFamily` — same career track (1.1×), cross-family (0.4×)
   - `domain` — 48 cluster-based domain detection; mismatch (0.3×), match buffs (1.05–1.15×)
   - `coherence` — penalizes title/description mismatch
   - `negative` — kills score (0.01×) on negative keywords
   - `language` — non-Latin script penalty (0.2×)
5. **Skill coverage cap** — 0 matches→35, 1→65, 2→80, 3→92, 4+→100. Prevents 1-skill matches from dominating.
6. **Hard caps** — Location cap (10 if loc ≤ 0.05), seniority cap (30 if sen ≤ 0.1), cross-family cap (45), domain mismatch cap (25), absolute max (100).

### Key Design Decisions
- Proper noun skills (Unity, React, Salesforce) matched case-sensitively against `rawJobText`
- Generic single-word skills matched with word-boundary regex against lowercased `skillMatchText`
- Multi-word skills matched as substring against lowercased text
- `gaming` role family ordered BEFORE `design` — iteration order determines which family wins
- `userClusters.size === 0` → domain neutral (1.0), not penalty — profiles with no detectable domain are not punished
- LinkedIn Guest returns title-only → 1-skill cap (65) is correct ceiling for these

### Test Profiles (for scoring regression)
| Profile | Expected ≥30 | Notes |
|---|---|---|
| Sanmitra (Sr SW Dev) | ~68 | Strong Bengaluru SW market |
| Mehdi (AI Ops) | ~38 | Niche tools rare in Bengaluru JDs |
| Jayanth (Game Designer) | ~15 | False positives eliminated April 9 |
| Gilles (Project Coordinator) | ~1 | Thin localization market |
| Tanish (Production Manager) | ~3 | Thin video production market |

---

## 6. Environment Variables

All must be set in Vercel (Production + Preview + Dev) and in `.env.local` for local dev.

| Variable | Purpose | Required |
|---|---|---|
| `OPENROUTER_API_KEY` | All LLM calls (Claude + Gemini via OpenRouter) | ✅ Critical |
| `UPSTASH_REDIS_REST_URL` | Redis cache + tokens + rate limiting | ✅ Critical |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth | ✅ Critical |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Auth (client) | ✅ Critical |
| `CLERK_SECRET_KEY` | Auth (server) | ✅ Critical |
| `RAZORPAY_KEY_SECRET` | Payment verification | ✅ Critical |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Payment (client) | ✅ Critical |
| `DATAFORSEO_AUTH` | Google Jobs via DataForSEO (Base64 login:pass) | Active |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Adzuna job API | Active |
| `OPENAI_API_KEY` | Embeddings (currently disabled) | Standby |
| `SERPER_API_KEY` | Serper.dev Google search | Active |
| `FINDWORK_API_KEY` | Findwork job API | Active |
| `JSEARCH_KEY` | JSearch (RapidAPI) | Active |
| `JOOBLE_API_KEY` | Jooble job API | Active |
| `REED_API_KEY` | Reed.co.uk API | Active |
| `APIFY_API_KEY` | Apify actors (scrapers) | Active |
| `ONET_API_KEY` | O*NET career data API | Standby |
| `RESEND_API_KEY` | Email (Resend) | Standby |
| `ADMIN_EMAILS` / `ADMIN_USER_IDS` | Admin route access control | Active |
| `NEXT_PUBLIC_APP_URL` | App base URL | Active |
| `MATCH_LOGS_TOKEN` | Auth for `/api/debug/match-logs` ring buffer drain | Optional |
| `DISABLE_MATCH_LOGGER=1` | Skip all match logging | Optional |
| `DEBUG_MATCH_LOGGER=1` | Surface logger errors instead of swallowing | Optional |

---

## 7. Deployment

- **Auto-deploy:** Push to `main` → Vercel builds + deploys automatically
- **Preview deploys:** Any branch creates a preview URL in Vercel
- **Project:** `jobbot-vercel` on Vercel (project ID `prj_Mndm9BFUbKNSOa3qv16CTCGqXpzI`)
- **Active branches:**
  - `main` — production
  - `preview/source-expansion` — source work (merged into main as of `303cb24`)
  - `qa/security-and-scoring-fixes` — QA branch
- **Function timeout:** Vercel serverless default. The SSE scan endpoint (`match-jobs-stream`) is a long-running function — stays alive for the full scan duration.

### Monitoring
```bash
# Live scan logs (most useful)
cd /c/Users/D/Vercel-Safe && node scripts/fetch-scan-logs.mjs --since=1h

# Raw Vercel logs
vercel logs --json --since 1h --limit 500

# Pull match debug logs from production ring buffer
node scripts/pull-match-logs.mjs

# Local match logs (last full day)
# C:\Users\D\Vercel-Safe\logs\matches\YYYY-MM-DD.jsonl
```

### Admin Routes
- `POST /api/admin/credit` — manually add tokens to a user
- `GET /api/admin/flags` — feature flags
- `POST /api/admin/flush-cache` — clear Redis cache
- `GET /api/admin/circuits` — circuit breaker status per source

---

## 8. Data Storage

**Important:** There is no database yet. This is a known liability.

| Data | Storage | Risk |
|---|---|---|
| Tokens / rate limits | Upstash Redis | Ephemeral — lost on flush |
| User profile | `localStorage` | Lost on clear / new device |
| Saved jobs | `localStorage` + Redis sync | Fragile |
| Applied jobs | `localStorage` | Fragile |
| Job scan results | `localStorage` | Fragile |
| Match debug logs | In-memory ring buffer (2000 entries) + local JSONL drain | Lost on redeploy |
| Feature flags | Upstash Redis | Ephemeral |

**Postgres migration is the top infrastructure priority** (planned for Week 4 but not started).

---

## 9. Known Bugs

### Open P1

| Bug | Description | Workaround |
|---|---|---|
| **SF Admin overqualification** | `"administrator"` has no seniority keyword → defaults to `mid` (3yr expected). A 5yr Salesforce Architect falls within sweet spot → no penalty. SF Admin scores same as SF Architect. | Fix: add `"administrator"` → `entry` in seniority lookup. |
| **DataForSEO wrong query** | System occasionally generates off-topic DataForSEO queries from inferred PDF skills (e.g. `"e-commerce Consultant"` for an IT Consultant). | Investigate query planner output for inferred skill influence. |

### Open P2

| Bug | Description |
|---|---|
| **Intra-country city penalty too harsh** | Dubai vs Abu Dhabi gets `loc:0.05` (wrongCity). Same-country nearby cities should get a softer penalty than cities in different countries. |
| **salesforce_crm domain not detecting in JDs** | "Salesforce CRM" in job text fails to cross the 2.0 weighted threshold → `dom:0.75` penalty on Salesforce jobs for Salesforce candidates. Threshold or keyword weights need tuning. |
| **Duplicate jobs in results** | Same job appearing multiple times when returned by multiple sources. Dedup is incomplete. |
| **LinkedIn 429 under Vercel IPs** | LinkedIn guest API throttles at 50-100 requests from Vercel egress IPs. ScraperAPI fallback not yet implemented. |
| **Naukri / Foundit timing out** | Both sources timing out or blocked. Need direct scraper bypass. |

### Open P3

| Bug | Description |
|---|---|
| **AI re-ranker not running** | Deep analysis (Claude Sonnet) showing `-` verdicts on recent scans — not wiring into production match logs. |
| **DataForSEO postback_url not implemented** | Currently using poll loop (5-30s per scan). postback_url webhook would eliminate this lag entirely. |
| **29+ swallowed catch blocks** | Server-side errors silently dropped across the codebase. |

### Fixed (do not re-open)
- ✅ Domain penalty for profiles with no detectable domain clusters (Gilles, Tanish)
- ✅ Unity/proper noun false positives — case-sensitive skill matching via `rawJobText`
- ✅ Jayanth `ev` automotive domain false positive — word-boundary in `detectDomainClusters()`
- ✅ Game Designer → design family (should be gaming) — `gaming` ordered before `design` in ROLE_FAMILIES
- ✅ Workday tenant catalog 41 → 713 tenants
- ✅ fetchAllJobs destructuring bug (last 4 sources silently lost)
- ✅ Payment verification error swallowed
- ✅ React #31 crash on job detail (LLM objects as React children — fixed with `safe()`)
- ✅ Country-only search returned 0 results
- ✅ Upstash 10MB request size limit
- ✅ 2.5MB dashboard bundle (country-state-city lazy-loaded — now 140kB)
- ✅ 8 Redis instantiations (now singleton)

---

## 10. LLM Cost Profile

| Endpoint | Model | Estimated cost |
|---|---|---|
| `/api/analyze-job` | Claude Sonnet 4 | ~$0.008–0.009/call |
| `/api/salary-negotiation` | Claude Sonnet 4 | ~$0.008–0.009/call |
| `/api/interview-prep` | Gemini Flash | ~$0.0002–0.0008/call |
| `/api/cover-letter` | Gemini Flash | ~$0.0002–0.0008/call |
| `/api/parse-resume` | Gemini Flash | ~$0.0002–0.0008/call |
| `/api/career-insights` | Gemini Flash | ~$0.0002–0.0008/call |
| `/api/resume-gaps` | Gemini Flash | ~$0.0002–0.0008/call |

All LLM calls route through OpenRouter (`lib/sonnet.js`). `callFlash()` is a direct Gemini Flash helper on the same wrapper.

---

## 11. Debug Workflows

### Check a live scan
```bash
cd /c/Users/D/Vercel-Safe
node scripts/fetch-scan-logs.mjs --since=30m
```

### Run synthetic scoring tests
```bash
node test/multi-profile-test.mjs        # 24 cases, all 5 profiles
node test/scoring-audit-verify.mjs      # 8 audit cases — all must pass
```

### Run a real fetch for a profile
```bash
node test/profile-scan.mjs sanmitra     # or mehdi|jayanth|gilles|tanish
```

### Read match debug logs
```bash
# JSONL lives at logs/matches/YYYY-MM-DD.jsonl (drained from production ring buffer)
# High-confidence picks:
node -e "const e=require('fs').readFileSync('logs/matches/2026-04-09.jsonl','utf8').trim().split('\n').map(JSON.parse); e.filter(x=>x.scores.panda>=80).sort((a,b)=>b.scores.panda-a.scores.panda).slice(0,10).forEach(x=>console.log(x.scores.panda,'|',x.job.title,'@',x.job.company))"
```

### Check source health
```bash
# Admin API (requires ADMIN_USER_IDS cookie)
curl https://<your-domain>/api/admin/circuits
```

---

## 12. What to Tackle Next

Ordered by impact:

### Immediate (scoring quality)
1. **Fix `administrator` seniority** — add `"administrator"` as `entry`-level keyword in the seniority lookup in `lib/panda-matcher.js`. Test: Sanchith (SF Architect, 5yr) vs SF Admin @ Infosys should drop from 100 to ≤40.
2. **Fix salesforce_crm domain detection** — "Salesforce CRM" in job text should cross the 2.0 threshold. Either lower threshold for this cluster or add more Salesforce-specific keywords. Test: SF jobs for SF candidates should get `dom:1.05(match)` not `dom:0.75(undetected)`.
3. **Fix intra-country city location** — cities in the same country as the user's city preference should get `sameCountryNoMatch` (0.04) not `wrongCity` (0.05) — the values are nearly the same but logic should be correct. Bigger fix: consider a UAE/GCC zone where Dubai + Abu Dhabi + Sharjah are treated as same metro.

### Infrastructure (P1 before scale)
4. **Postgres migration** — Replace Redis + localStorage for all user data. Tables: users, profiles, scan_results, saved_jobs, applications, tokens. This is the single biggest reliability gap.
5. **DataForSEO postback_url** — Build `app/api/dataforseo/postback/route.js`. Add `postback_url` + `tag` (`userId:searchId`) to task_post requests. Eliminates 5-30s polling per scan.
6. **LinkedIn ScraperAPI fallback** — Add ScraperAPI (1k/mo free) as fallback when LinkedIn 429s under Vercel IPs.

### Coverage
7. **Naukri/Foundit direct scraper** — These are the most job-dense India sources. Naukri blocks API access; needs Apify actor or puppeteer approach.
8. **Deduplication fix** — Same job appearing from multiple sources should be collapsed by (title + company + location) hash before scoring.

### Product
9. **AI re-ranker wiring** — Debug why deep analysis verdicts show `-` in production match logs. Ensure ring buffer is draining to logs correctly.
10. **Chrome extension** — Panda score overlay on LinkedIn/Indeed job listings. Highest revenue potential per the product roadmap.

---

## 13. Repository Layout (Top Level)

```
Vercel-Safe/
├── app/                    Next.js App Router pages + API routes
│   ├── api/                All API endpoints
│   └── dashboard/          Authenticated pages
├── components/             React components
├── contexts/               AppContext (thin, delegates to Zustand stores)
├── lib/                    Core business logic
│   └── sources/            Job source plugins
├── test/                   Test scripts (run with node, not Jest)
├── scripts/                Operational scripts (log fetching, diagnostics)
├── logs/
│   └── matches/            JSONL debug logs (drain from prod ring buffer)
├── __tests__/              Jest tests (panda-matcher.test.js)
├── scoring-config.js       ← lib/scoring-config.js (all tunable weights)
├── HANDOVER.md             This file
└── .env.local              Local env vars (never commit)
```

---

## 14. Contacts / Accounts

- **GitHub:** `mehdishayek-png`
- **Vercel:** project `jobbot-vercel`
- **DataForSEO:** account `midasmatchsupport@gmail.com`, $50 deposit, `DATAFORSEO_AUTH` in Vercel env
- **OpenRouter:** all LLM routing goes here (Claude + Gemini)
- **Razorpay:** INR payments, `RAZORPAY_KEY_SECRET` in Vercel env
- **Clerk:** auth provider, keys in Vercel env
- **Upstash:** Redis instance, keys in Vercel env
