# Midas Match Project Overview

Midas Match is an evidence-led job search and career workspace. It retrieves broadly, ranks conservatively, and exposes the signals behind each recommendation.

## Product Flow

1. A user uploads a resume or creates a target profile.
2. Midas generates focused role queries and requires explicit location intent.
3. A location-aware registry starts eligible job sources concurrently.
4. Results are deduplicated and thin job descriptions are enriched.
5. Panda applies deterministic role-family, domain, seniority, location, recency, and quality constraints.
6. pgvector semantic refinement re-ranks the strongest candidates.
7. Results stream to the UI and persist as a cross-device search run.
8. Users shortlist roles, track applications, and generate job-specific preparation.

## Platform

- Next.js 15 App Router and React 18
- Clerk authentication
- Railway Postgres and pgvector as primary persistence
- Upstash Redis for cache, rate limiting, and circuit support
- Zustand for client state with local resilience caches
- OpenRouter and OpenAI for profile, intelligence, and embedding workflows
- Apify plus direct ATS/public data integrations for retrieval
- Sentry and structured diagnostics for observability
- Railway Railpack for deployment

## Reliability Principles

- Retrieval sources have explicit time and spend budgets.
- Partial source output is retained when a source times out.
- One failed source never fails a complete scan.
- Core deterministic ranking does not depend on an LLM response.
- Search, profile, shortlist, and pipeline state persist in Postgres.
- Deployments run forward-only migrations and pass a database readiness check before receiving traffic.

See `README.md` for setup and `HANDOVER.md` for operational detail.
