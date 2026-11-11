BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_rate_limit_buckets (
    scope text NOT NULL,
    subject_hash char(64) NOT NULL,
    window_started_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    PRIMARY KEY (scope, subject_hash)
);

CREATE INDEX IF NOT EXISTS auth_rate_limit_buckets_window_started_at_idx
    ON public.auth_rate_limit_buckets (window_started_at);

INSERT INTO public.schema_migrations (version, name)
VALUES ('024', 'Database-backed authentication rate limits')
ON CONFLICT (version) DO NOTHING;

COMMIT;
