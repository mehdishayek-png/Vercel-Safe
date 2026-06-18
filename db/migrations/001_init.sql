-- Midas Match — initial schema
-- Postgres + pgvector. Run via scripts/migrate.mjs.
--
-- Phase split:
--   * job_embeddings + profiles.role_emb power the semantic re-rank (search quality).
--   * users / user_tokens / saved_jobs / applications back the persistence migration
--     off Redis + localStorage. These tables are created now but the app is wired to
--     them in a later phase, so creating them here is inert and safe.

CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Users (keyed by Clerk user id) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    email       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Profiles (CV-extracted profile, one per user) ──────────────────────────
-- data: { headline, skills[], whatIDo, industry, experience, preferences, ... }
-- role_emb: cached embedding of buildRoleText(profile); role_emb_hash guards staleness.
CREATE TABLE IF NOT EXISTS profiles (
    user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data          JSONB NOT NULL DEFAULT '{}',
    role_emb      vector(1536),
    role_emb_hash TEXT,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Token balances (atomic billing) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_tokens (
    user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance     INTEGER NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Saved jobs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_jobs (
    user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_key   TEXT NOT NULL,
    job       JSONB NOT NULL,
    saved_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, job_key)
);

-- ─── Applications ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_key     TEXT NOT NULL,
    job         JSONB NOT NULL,
    status      TEXT NOT NULL DEFAULT 'applied',
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, job_key)
);

-- ─── Job embedding cache (content-addressed) ────────────────────────────────
-- content_hash: stable hash of buildJobText(job). Lets repeat jobs across scans
-- reuse a single embedding instead of re-paying the OpenAI call. Doubles as the
-- corpus for semantic retrieval (RAG) queries.
CREATE TABLE IF NOT EXISTS job_embeddings (
    content_hash  TEXT PRIMARY KEY,
    embedding     vector(1536) NOT NULL,
    job_title     TEXT,
    job_company   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index for fast approximate cosine-distance retrieval.
CREATE INDEX IF NOT EXISTS job_embeddings_hnsw
    ON job_embeddings USING hnsw (embedding vector_cosine_ops);
