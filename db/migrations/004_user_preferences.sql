-- User search preferences are durable and independent from the parsed profile.

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data        JSONB NOT NULL DEFAULT '{}',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
