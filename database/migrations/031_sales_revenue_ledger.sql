BEGIN;

CREATE TABLE public.sales (
    organization_id integer NOT NULL
        REFERENCES public.organizations(organization_id) ON DELETE CASCADE,
    sale_id uuid NOT NULL,
    payment_method varchar(10) NOT NULL
        CHECK (payment_method IN ('cash', 'card', 'qr')),
    created_by_email varchar(320) NOT NULL,
    sold_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sale_id)
);

CREATE TABLE public.sale_items (
    organization_id integer NOT NULL,
    sale_id uuid NOT NULL,
    product_id integer NOT NULL,
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_price numeric(14, 2) NOT NULL CHECK (unit_price >= 0),
    PRIMARY KEY (organization_id, sale_id, product_id),
    CONSTRAINT fk_sale_items_sale
        FOREIGN KEY (organization_id, sale_id)
        REFERENCES public.sales(organization_id, sale_id) ON DELETE CASCADE,
    CONSTRAINT fk_sale_items_product
        FOREIGN KEY (organization_id, product_id)
        REFERENCES public.products(organization_id, product_id)
);

CREATE INDEX ix_sales_org_sold_at
    ON public.sales (organization_id, sold_at DESC);

INSERT INTO public.schema_migrations (version, name)
VALUES ('031', 'Add sales revenue ledger')
ON CONFLICT (version) DO NOTHING;

COMMIT;
