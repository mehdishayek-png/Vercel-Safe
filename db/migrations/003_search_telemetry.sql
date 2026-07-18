-- Durable retrieval, ranking, and outcome telemetry.
-- Stores bounded job metadata and score evidence, never resume source files.

ALTER TABLE search_runs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE search_runs ADD COLUMN IF NOT EXISTS queries JSONB NOT NULL DEFAULT '[]';
ALTER TABLE search_runs ADD COLUMN IF NOT EXISTS role_family TEXT;
ALTER TABLE search_runs ADD COLUMN IF NOT EXISTS anti_families JSONB NOT NULL DEFAULT '[]';
ALTER TABLE search_runs ADD COLUMN IF NOT EXISTS total_raw INTEGER NOT NULL DEFAULT 0;
ALTER TABLE search_runs ADD COLUMN IF NOT EXISTS total_unique INTEGER NOT NULL DEFAULT 0;
ALTER TABLE search_runs ADD COLUMN IF NOT EXISTS total_scored INTEGER NOT NULL DEFAULT 0;
ALTER TABLE search_runs ADD COLUMN IF NOT EXISTS total_discarded INTEGER NOT NULL DEFAULT 0;
ALTER TABLE search_runs ADD COLUMN IF NOT EXISTS engine_version TEXT;
ALTER TABLE search_runs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS search_runs_status_created_idx
    ON search_runs (status, created_at DESC);

CREATE TABLE IF NOT EXISTS search_source_metrics (
    run_id           TEXT NOT NULL REFERENCES search_runs(id) ON DELETE CASCADE,
    source_name      TEXT NOT NULL,
    source_type      TEXT NOT NULL DEFAULT 'unknown',
    status           TEXT NOT NULL DEFAULT 'success',
    cache_hit        BOOLEAN NOT NULL DEFAULT false,
    latency_ms       INTEGER NOT NULL DEFAULT 0,
    raw_count        INTEGER NOT NULL DEFAULT 0,
    unique_count     INTEGER NOT NULL DEFAULT 0,
    duplicate_count  INTEGER NOT NULL DEFAULT 0,
    enriched_count   INTEGER NOT NULL DEFAULT 0,
    scored_count     INTEGER NOT NULL DEFAULT 0,
    displayed_count  INTEGER NOT NULL DEFAULT 0,
    discarded_count  INTEGER NOT NULL DEFAULT 0,
    zero_count       INTEGER NOT NULL DEFAULT 0,
    error_code       TEXT,
    metadata         JSONB NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (run_id, source_name)
);

CREATE INDEX IF NOT EXISTS search_source_metrics_source_created_idx
    ON search_source_metrics (source_name, created_at DESC);

CREATE TABLE IF NOT EXISTS search_candidates (
    run_id             TEXT NOT NULL REFERENCES search_runs(id) ON DELETE CASCADE,
    job_key            TEXT NOT NULL,
    source_name        TEXT NOT NULL DEFAULT 'Unknown',
    title              TEXT NOT NULL DEFAULT '',
    company            TEXT NOT NULL DEFAULT '',
    location           TEXT NOT NULL DEFAULT '',
    apply_url           TEXT,
    score               REAL NOT NULL DEFAULT 0,
    final_score         REAL,
    decision            TEXT NOT NULL,
    display_threshold   REAL NOT NULL DEFAULT 25,
    killer              TEXT,
    description_chars   INTEGER NOT NULL DEFAULT 0,
    multipliers         JSONB NOT NULL DEFAULT '{}',
    boosts              JSONB NOT NULL DEFAULT '[]',
    metadata            JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (run_id, job_key)
);

CREATE INDEX IF NOT EXISTS search_candidates_decision_score_idx
    ON search_candidates (decision, score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS search_candidates_source_created_idx
    ON search_candidates (source_name, created_at DESC);

CREATE TABLE IF NOT EXISTS search_outcomes (
    event_id    TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    run_id      TEXT REFERENCES search_runs(id) ON DELETE SET NULL,
    job_key     TEXT NOT NULL,
    action      TEXT NOT NULL,
    score       REAL NOT NULL DEFAULT 0,
    rank        INTEGER,
    source_name TEXT,
    metadata    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS search_outcomes_run_created_idx
    ON search_outcomes (run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS search_outcomes_action_created_idx
    ON search_outcomes (action, created_at DESC);
CREATE INDEX IF NOT EXISTS search_outcomes_user_created_idx
    ON search_outcomes (user_id, created_at DESC);
