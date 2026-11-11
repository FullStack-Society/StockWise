BEGIN;

-- Inventory queries filter soft-deleted products and deletion actions update
-- these fields. Older database exports did not include them.
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

INSERT INTO public.schema_migrations (version, name)
VALUES ('032', 'Add product soft-delete fields')
ON CONFLICT (version) DO NOTHING;

COMMIT;
