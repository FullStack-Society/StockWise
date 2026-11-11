BEGIN;

ALTER TABLE public.user_settings
    ADD COLUMN IF NOT EXISTS google_account_connected boolean NOT NULL DEFAULT false;

INSERT INTO public.schema_migrations (version, name)
VALUES ('018', 'Google account connection status')
ON CONFLICT (version) DO NOTHING;

COMMIT;
