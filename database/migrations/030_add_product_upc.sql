BEGIN;

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS upc varchar(12);

CREATE UNIQUE INDEX IF NOT EXISTS products_organization_upc_unique_idx
    ON public.products (organization_id, upc)
    WHERE upc IS NOT NULL;

INSERT INTO public.schema_migrations (version, name)
VALUES ('030', 'Add UPC-A product barcodes')
ON CONFLICT (version) DO NOTHING;

COMMIT;
