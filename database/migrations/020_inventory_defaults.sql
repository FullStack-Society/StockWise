BEGIN;

ALTER TABLE public.user_settings
    ADD COLUMN IF NOT EXISTS default_reorder_point integer NOT NULL DEFAULT 50;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.user_settings'::regclass
          AND conname = 'user_settings_default_reorder_point_check'
    ) THEN
        ALTER TABLE public.user_settings
            ADD CONSTRAINT user_settings_default_reorder_point_check
            CHECK (default_reorder_point >= 0);
    END IF;
END;
$$;

INSERT INTO public.schema_migrations (version, name)
VALUES ('020', 'Saved inventory default reorder point')
ON CONFLICT (version) DO NOTHING;

COMMIT;
