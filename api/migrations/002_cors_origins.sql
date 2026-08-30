CREATE TABLE IF NOT EXISTS cors_origins (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    origin      TEXT        NOT NULL,
    enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cors_origins_origin_key
    ON cors_origins (lower(origin));

CREATE INDEX IF NOT EXISTS cors_origins_enabled_idx
    ON cors_origins (enabled)
    WHERE enabled;

INSERT INTO cors_origins (origin, description)
VALUES ('http://localhost:3000', 'Local development web app')
ON CONFLICT (lower(origin)) DO NOTHING;
