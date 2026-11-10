BEGIN;

CREATE TABLE IF NOT EXISTS public.organization_payment_settings (
    organization_id integer PRIMARY KEY
        REFERENCES public.organizations (organization_id) ON DELETE CASCADE,
    merchant_qr_data text,
    updated_by_email text,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.schema_migrations (version, name)
VALUES ('033', 'Share merchant payment QR by organization')
ON CONFLICT (version) DO NOTHING;

COMMIT;
