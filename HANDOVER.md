# Midas Match Engineering Handover

Last updated: 2026-07-18

## Product

Midas Match is a career intelligence workspace. A user uploads a resume or creates a role profile, chooses a required location, and runs a market search. Results stream as sources finish and include an explainable score, source provenance, job description, shortlist actions, application tracking, and on-demand job intelligence.

## Current Stack

| Layer | Current implementation |
|---|---|
| Web | Next.js 15 App Router, React 18 |
| UI | Tailwind CSS, Framer Motion, Lucide |
| Auth | Clerk |
| Client state | Zustand with local fallback |
| Primary data | Railway Postgres + pgvector |
| Cache / rate limit | Upstash Redis |
| Retrieval | Registry-driven APIs, feeds, ATS integrations, Apify, controlled scrapers |
| Ranking | Panda matcher + OpenAI `text-embedding-3-small` semantic refinement |
| AI | OpenRouter orchestration with graceful fallback |
| Monitoring | Sentry, structured scan diagnostics, request IDs |
| Analytics | GA4 |
| Runtime | Railway Railpack, Node 20+ |

## Primary Routes

- `/dashboard/search`: resume/profile setup, required location, streamed matching
- `/dashboard/saved`: shortlist
- `/dashboard/applications`: application pipeline
- `/dashboard/job/[id]`: score evidence, full JD, analysis, cover letter, negotiation
- `/dashboard/prep`: interview preparation
- `/dashboard/settings`: profile and preferences
- `/api/match-jobs-stream`: main SSE retrieval and scoring path
- `/api/search-history`: cross-device search run persistence
- `/api/health`: Railway readiness endpoint

## Persistence

Migrations are in `db/migrations/` and are applied lexically by `scripts/migrate.mjs`.

- `users`: Clerk identity anchor
- `profiles`: extracted profile JSON and cached role embedding
- `saved_jobs`: cross-device shortlist
- `applications`: cross-device pipeline
- `job_embeddings`: content-addressed pgvector cache
- `search_runs`: search context, source totals, duration
- `search_results`: ranked job snapshots for each run

Local storage remains a resilience cache. Postgres is the signed-in source of truth.

## Retrieval Pipeline

1. `buildQueries()` creates targeted role queries and resolves location intent.
2. `getSourcesByPhase()` selects only enabled, region-compatible sources.
3. `fetchAllJobsStreaming()` runs sources concurrently and deduplicates globally.
4. `enrichThinJDs()` recovers descriptions where the source only returns snippets.
5. Panda applies role-family, domain, seniority, location, recency, and quality constraints.
6. Eligible results stream immediately through SSE.
7. The strongest candidates receive pgvector semantic refinement.
8. The browser persists the completed ranked result set through `/api/search-history`.

Do not add a source to the registry unless its fetcher is present in the orchestrator context and it has a strict execution budget.

## Apify Policy

Use `runActorWithinBudget()` for every Actor:

- run timeout and client wait are explicit;
- `maxItems` and `maxTotalChargeUsd` cap spend;
- overdue runs are aborted;
- partial dataset items are retained and returned;
- location strings are normalized for each actor schema.

LinkedIn Actor queries run in parallel. Dice and Naukri run concurrently. Wellfound and Foundit are disabled because the current registry has no production fetchers for them.

## Reliability

- Source errors degrade to an empty source result, not a failed scan.
- Per-source circuit breakers stop repeated calls to failing integrations.
- Redis cache reduces repeat source cost.
- Postgres failures leave local profile/results fallback available.
- `/api/health` returns 200 only when Postgres is reachable.
- Railway runs migrations before the new deployment receives traffic.
- Admin circuit and flag mutations require Clerk admin authorization.
- Middleware adds security headers and a request ID.

## Access and Payments

Product access is currently included and token gating is disabled. New Razorpay orders return HTTP 409. The verification endpoint remains to honor already-created payments. Do not re-enable checkout without reintroducing one consistent billing model across API enforcement, UI, legal copy, and Postgres ledgering.

## Deployment

Railway configuration lives in `railway.toml`:

```text
build       npm ci && npm run build
pre-deploy  npm run db:migrate
start       npm start
health      /api/health
```

Production requires `DATABASE_URL`, Clerk credentials, Upstash credentials, and the model/source credentials chosen for the environment.

## Known Quality Gates

- The production build passes on Next.js 15.5.
- New Apify budget tests pass.
- Eight older Panda matcher assertions currently disagree with the existing matcher behavior. The rebuild did not modify Panda; reconcile those expectations before treating `npm test` as a release gate.
- `npm audit` reports a moderate PostCSS advisory in Next.js's bundled dependency. The available automated fix incorrectly downgrades Next.js and must not be used.

## Engineering Rules

- Preserve the deterministic matcher unless a scoring change is explicitly requested and covered by profile-level regression tests.
- Add retrieval sources through `lib/sources/registry.js`, never directly in the route.
- Validate every write API with Clerk auth, CSRF origin checks, and bounded payloads.
- Keep source and AI failures observable but non-fatal.
- Run `npm run build` before every production push.
