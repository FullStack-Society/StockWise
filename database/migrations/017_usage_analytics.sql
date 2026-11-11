BEGIN;

ALTER TABLE public.user_settings
    ADD COLUMN IF NOT EXISTS usage_analytics boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.stockwise_usage_daily (
    organization_id integer NOT NULL
        REFERENCES public.organizations(organization_id) ON DELETE CASCADE,
    usage_date date NOT NULL DEFAULT CURRENT_DATE,
    page_key varchar(32) NOT NULL CHECK (
        page_key IN ('dashboard', 'inventory', 'orders', 'reports', 'settings', 'users')
    ),
    view_count bigint NOT NULL DEFAULT 0 CHECK (view_count >= 0),
    PRIMARY KEY (organization_id, usage_date, page_key)
);

INSERT INTO public.schema_migrations (version, name)
VALUES ('017', 'Opt-in anonymous usage analytics')
ON CONFLICT (version) DO NOTHING;

COMMIT;
