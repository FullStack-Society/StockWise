BEGIN;

-- Product unit costs are no longer used by inventory, orders, or reports.
ALTER TABLE public.products
    DROP COLUMN IF EXISTS unit_cost;

INSERT INTO public.schema_migrations (version, name)
VALUES ('028', 'Remove unused product unit cost')
ON CONFLICT (version) DO NOTHING;

COMMIT;
