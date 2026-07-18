-- Persist completed searches and their ranked result set across devices.

CREATE TABLE IF NOT EXISTS search_runs (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_context JSONB NOT NULL DEFAULT '{}',
    preferences     JSONB NOT NULL DEFAULT '{}',
    sources         JSONB NOT NULL DEFAULT '{}',
    total_fetched   INTEGER NOT NULL DEFAULT 0,
    total_displayed INTEGER NOT NULL DEFAULT 0,
    duration_ms     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS search_runs_user_created_idx
    ON search_runs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS search_results (
    run_id      TEXT NOT NULL REFERENCES search_runs(id) ON DELETE CASCADE,
    job_key     TEXT NOT NULL,
    job         JSONB NOT NULL,
    score       REAL NOT NULL DEFAULT 0,
    rank        INTEGER NOT NULL,
    PRIMARY KEY (run_id, job_key)
);

CREATE INDEX IF NOT EXISTS search_results_run_rank_idx
    ON search_results (run_id, rank);
