-- Inventory costing and variants.
BEGIN;
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS unit_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    ADD COLUMN IF NOT EXISTS variant varchar(200);

-- Keep the location-aware product lookup compatible with inventory fields.
CREATE OR REPLACE FUNCTION public.organization_get_inventory(
    p_organization_id integer,
    p_search text DEFAULT NULL,
    p_category_id integer DEFAULT NULL,
    p_stock_status text DEFAULT NULL,
    p_location_id integer DEFAULT NULL
)
RETURNS TABLE(
    product_id integer, product_name text, sku text, category_id integer,
    description text, price numeric, quantity integer, reorder_point integer,
    location_id integer, location_name text, created_at timestamptz,
    updated_at timestamptz, category_name text, status text
)
LANGUAGE sql STABLE
AS $function$
    SELECT p.product_id, p.product_name::text, p.sku::text, p.category_id,
           p.description::text, p.price, s.quantity, s.reorder_point,
           l.location_id, l.location_name::text, p.created_at, p.updated_at,
           c.category_name::text,
           public.stockwise_inventory_status(s.quantity, s.reorder_point)
    FROM public.products AS p
    JOIN public.inventory_location_stock AS s
      ON s.organization_id = p.organization_id AND s.product_id = p.product_id
    JOIN public.inventory_locations AS l
      ON l.organization_id = s.organization_id AND l.location_id = s.location_id
     AND l.is_active = true
    LEFT JOIN public.categories AS c
      ON c.category_id = p.category_id AND c.organization_id = p.organization_id
    WHERE p.organization_id = p_organization_id AND p.is_deleted = false
      AND (p_location_id IS NULL OR l.location_id = p_location_id)
      AND (NULLIF(btrim(p_search), '') IS NULL
           OR p.product_name ILIKE '%' || btrim(p_search) || '%'
           OR p.sku ILIKE '%' || btrim(p_search) || '%'
           OR p.variant ILIKE '%' || btrim(p_search) || '%')
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (NULLIF(btrim(p_stock_status), '') IS NULL
           OR public.stockwise_inventory_status(s.quantity, s.reorder_point) = btrim(p_stock_status))
    ORDER BY p.product_id DESC;
$function$;

INSERT INTO public.schema_migrations (version, name)
VALUES ('012', 'Inventory costs and variants')
ON CONFLICT (version) DO NOTHING;

COMMIT;
