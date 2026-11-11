BEGIN;

ALTER TABLE public.user_settings
    ADD COLUMN IF NOT EXISTS avatar_data text;

INSERT INTO public.schema_migrations (version, name)
VALUES ('029', 'Add account profile avatar images')
ON CONFLICT (version) DO NOTHING;

COMMIT;
