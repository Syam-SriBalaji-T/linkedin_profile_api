ALTER TABLE users
    ADD COLUMN session_token_hash TEXT,
    ADD COLUMN session_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS users_session_token_hash_key
    ON users (session_token_hash);

CREATE INDEX IF NOT EXISTS users_session_expires_at_idx
    ON users (session_expires_at);

DROP TABLE IF EXISTS sessions;
