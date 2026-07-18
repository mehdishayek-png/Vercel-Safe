# Midas Match

Evidence-led job search. Midas converts a resume into a focused market search, streams results from eligible sources, applies deterministic constraints, and semantically refines the strongest matches.

## Architecture

- **Application:** Next.js 15 App Router, React 18, Tailwind CSS, Zustand
- **Authentication:** Clerk
- **Primary persistence:** Railway Postgres with pgvector
- **Cache and rate limiting:** Upstash Redis
- **Job retrieval:** Direct ATS APIs, public feeds, specialist APIs, Apify Actors, and controlled scrapers
- **Ranking:** Panda deterministic matcher followed by OpenAI embedding re-ranking
- **AI workflows:** OpenRouter models for profile extraction and job intelligence
- **Observability:** Sentry, structured scan diagnostics, Google Analytics
- **Deployment:** Railway with Railpack, pre-deploy migrations, and a database-backed readiness check

The matching engine degrades gracefully: source failures do not fail the whole scan, and deterministic scoring remains available if semantic ranking is unavailable.

## Local Development

Requirements: Node.js 20+, npm, and a Postgres database with the `vector` extension.

```bash
npm ci
npm run db:migrate
npm run dev
```

Create `.env.local` for local credentials. Core variables:

```bash
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
OPENROUTER_API_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Sources are optional and activate only when their credentials exist. Common integrations include `APIFY_API_TOKEN`, `JSEARCH_KEY`, `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `FIRECRAWL_API_KEY`, `SERPER_API_KEY`, `USAJOBS_API_KEY`, `JOOBLE_API_KEY`, and `REED_API_KEY`.

## Commands

```bash
npm run dev          # local server
npm run build        # production build
npm test             # Vitest suite
npm run db:migrate   # forward-only SQL migrations
```

## Data Flow

```text
Resume/profile
  -> query planner
  -> location-aware source registry
  -> concurrent source streams
  -> job description enrichment
  -> Panda constraint scoring
  -> pgvector semantic refinement
  -> ranked SSE results
  -> Postgres search history / shortlist / pipeline
```

## Deployment

`railway.toml` is the deployment source of truth:

1. Railpack runs `npm ci && npm run build`.
2. The pre-deploy phase runs all unapplied migrations.
3. Railway starts the Next.js service with `npm start`.
4. Traffic shifts only after `/api/health` confirms Postgres is ready.

Never commit secrets. Use Railway variables and reference `DATABASE_URL` from the attached Postgres service.

## Source Budgets

Apify runs are bounded by time, item count, and charge. If an Actor exceeds the search budget, Midas aborts it and retains already-pushed dataset items. Broken or unimplemented registry entries remain disabled rather than failing every scan.

## Current Access Model

Checkout is paused while rebuilt access is included. The Razorpay order endpoint rejects new purchases; historical payment verification remains available for already-created orders.
