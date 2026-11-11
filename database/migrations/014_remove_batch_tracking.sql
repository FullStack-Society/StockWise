-- Simplify inventory receiving and counting by removing lot/batch tracking.
BEGIN;

ALTER TABLE public.products DROP COLUMN IF EXISTS track_lots;
DROP TABLE IF EXISTS public.inventory_lots;

INSERT INTO public.schema_migrations (version, name)
VALUES ('014', 'Remove batch and expiry tracking')
ON CONFLICT (version) DO NOTHING;

COMMIT;
