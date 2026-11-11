BEGIN;

ALTER TABLE public.purchase_order_items
    ADD COLUMN unit_price numeric(14, 2) NOT NULL DEFAULT 0
        CHECK (unit_price >= 0);

-- Existing orders did not keep a unit value; use the product's current price
-- as the best available starting value for those records.
UPDATE public.purchase_order_items AS item
SET unit_price = COALESCE(product.price, 0)
FROM public.products AS product
JOIN public.purchase_orders AS purchase_order
  ON purchase_order.organization_id = product.organization_id
 AND purchase_order.deleted_at IS NULL
WHERE product.organization_id = item.organization_id
  AND product.product_id = item.product_id
  AND purchase_order.organization_id = item.organization_id
  AND purchase_order.order_id = item.order_id;

CREATE OR REPLACE FUNCTION public.stockwise_create_purchase_order(
    p_organization_id integer,
    p_email text,
    p_notes text,
    p_items jsonb
)
RETURNS bigint
LANGUAGE plpgsql
AS $function$
DECLARE
    v_item jsonb;
    v_product_id integer;
    v_quantity integer;
    v_unit_price numeric;
    v_order_id bigint;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.organization_memberships AS membership
        WHERE membership.organization_id = p_organization_id
          AND lower(membership.email) = lower(btrim(p_email))
          AND membership.status = 'active'
    ) THEN
        RAISE EXCEPTION 'User is not an active member of this organization'
            USING ERRCODE = '42501';
    END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Add between 1 and 100 products to the order'
            USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN
        RAISE EXCEPTION 'Add between 1 and 100 products to the order'
            USING ERRCODE = '22023';
    END IF;
    IF p_notes IS NOT NULL AND length(p_notes) > 1000 THEN
        RAISE EXCEPTION 'Order notes must be 1,000 characters or fewer'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.purchase_orders (
        organization_id, created_by_email, notes
    ) VALUES (
        p_organization_id, lower(btrim(p_email)), NULLIF(btrim(p_notes), '')
    )
    RETURNING order_id INTO v_order_id;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        IF jsonb_typeof(v_item) IS DISTINCT FROM 'object'
           OR jsonb_typeof(v_item->'product_id') IS DISTINCT FROM 'number'
           OR jsonb_typeof(v_item->'quantity_ordered') IS DISTINCT FROM 'number'
           OR jsonb_typeof(v_item->'unit_price') IS DISTINCT FROM 'number'
           OR COALESCE(v_item->>'product_id', '') !~ '^[1-9][0-9]{0,9}$'
           OR COALESCE(v_item->>'quantity_ordered', '') !~ '^[1-9][0-9]{0,9}$' THEN
            RAISE EXCEPTION 'Each order item needs a valid product, quantity, and unit value'
                USING ERRCODE = '22023';
        END IF;
        IF (v_item->>'product_id')::numeric > 2147483647
           OR (v_item->>'quantity_ordered')::numeric > 2147483647 THEN
            RAISE EXCEPTION 'Each order item needs a valid product, quantity, and unit value'
                USING ERRCODE = '22023';
        END IF;
        v_product_id := (v_item->>'product_id')::integer;
        v_quantity := (v_item->>'quantity_ordered')::integer;
        v_unit_price := (v_item->>'unit_price')::numeric;
        IF v_unit_price < 0 OR v_unit_price > 999999999999.99
           OR scale(v_unit_price) > 2 THEN
            RAISE EXCEPTION 'Unit value must be non-negative with at most two decimals'
                USING ERRCODE = '22023';
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.purchase_order_items AS item
            WHERE item.organization_id = p_organization_id
              AND item.order_id = v_order_id
              AND item.product_id = v_product_id
        ) THEN
            RAISE EXCEPTION 'A product can only appear once in an order'
                USING ERRCODE = '22023';
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM public.products AS product
            WHERE product.organization_id = p_organization_id
              AND product.product_id = v_product_id
              AND product.is_deleted = false
        ) THEN
            RAISE EXCEPTION 'A selected product was not found'
                USING ERRCODE = 'P0002';
        END IF;

        INSERT INTO public.purchase_order_items (
            organization_id, order_id, product_id, quantity_ordered, unit_price
        ) VALUES (
            p_organization_id, v_order_id, v_product_id, v_quantity, v_unit_price
        );
    END LOOP;
    RETURN v_order_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_update_purchase_order(
    p_organization_id integer,
    p_email text,
    p_order_id bigint,
    p_notes text,
    p_items jsonb
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
    v_item jsonb;
    v_product_id integer;
    v_quantity integer;
    v_unit_price numeric;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.organization_memberships AS membership
        WHERE membership.organization_id = p_organization_id
          AND lower(membership.email) = lower(btrim(p_email))
          AND membership.status = 'active'
    ) THEN
        RAISE EXCEPTION 'User is not an active member of this organization'
            USING ERRCODE = '42501';
    END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Add between 1 and 100 products to the order'
            USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN
        RAISE EXCEPTION 'Add between 1 and 100 products to the order'
            USING ERRCODE = '22023';
    END IF;
    IF p_notes IS NOT NULL AND length(p_notes) > 1000 THEN
        RAISE EXCEPTION 'Order notes must be 1,000 characters or fewer'
            USING ERRCODE = '22023';
    END IF;

    PERFORM 1
    FROM public.purchase_orders AS purchase_order
    WHERE purchase_order.organization_id = p_organization_id
      AND purchase_order.order_id = p_order_id
      AND purchase_order.deleted_at IS NULL
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order was not found'
            USING ERRCODE = 'P0002';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.purchase_order_items AS item
        WHERE item.organization_id = p_organization_id
          AND item.order_id = p_order_id
          AND item.quantity_received > 0
    ) THEN
        RAISE EXCEPTION 'A purchase order cannot be edited after receiving items'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.purchase_orders
    SET notes = NULLIF(btrim(p_notes), '')
    WHERE organization_id = p_organization_id AND order_id = p_order_id;
    DELETE FROM public.purchase_order_items
    WHERE organization_id = p_organization_id AND order_id = p_order_id;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        IF jsonb_typeof(v_item) IS DISTINCT FROM 'object'
           OR jsonb_typeof(v_item->'product_id') IS DISTINCT FROM 'number'
           OR jsonb_typeof(v_item->'quantity_ordered') IS DISTINCT FROM 'number'
           OR jsonb_typeof(v_item->'unit_price') IS DISTINCT FROM 'number'
           OR COALESCE(v_item->>'product_id', '') !~ '^[1-9][0-9]{0,9}$'
           OR COALESCE(v_item->>'quantity_ordered', '') !~ '^[1-9][0-9]{0,9}$' THEN
            RAISE EXCEPTION 'Each order item needs a valid product, quantity, and unit value'
                USING ERRCODE = '22023';
        END IF;
        IF (v_item->>'product_id')::numeric > 2147483647
           OR (v_item->>'quantity_ordered')::numeric > 2147483647 THEN
            RAISE EXCEPTION 'Each order item needs a valid product, quantity, and unit value'
                USING ERRCODE = '22023';
        END IF;
        v_product_id := (v_item->>'product_id')::integer;
        v_quantity := (v_item->>'quantity_ordered')::integer;
        v_unit_price := (v_item->>'unit_price')::numeric;
        IF v_unit_price < 0 OR v_unit_price > 999999999999.99
           OR scale(v_unit_price) > 2 THEN
            RAISE EXCEPTION 'Unit value must be non-negative with at most two decimals'
                USING ERRCODE = '22023';
        END IF;
        IF EXISTS (
            SELECT 1 FROM public.purchase_order_items AS item
            WHERE item.organization_id = p_organization_id
              AND item.order_id = p_order_id
              AND item.product_id = v_product_id
        ) THEN
            RAISE EXCEPTION 'A product can only appear once in an order'
                USING ERRCODE = '22023';
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM public.products AS product
            WHERE product.organization_id = p_organization_id
              AND product.product_id = v_product_id
              AND product.is_deleted = false
        ) THEN
            RAISE EXCEPTION 'A selected product was not found'
                USING ERRCODE = 'P0002';
        END IF;
        INSERT INTO public.purchase_order_items (
            organization_id, order_id, product_id, quantity_ordered, unit_price
        ) VALUES (
            p_organization_id, p_order_id, v_product_id, v_quantity, v_unit_price
        );
    END LOOP;
    RETURN TRUE;
END;
$function$;

DROP FUNCTION public.stockwise_get_purchase_orders(integer, bigint, integer);
CREATE FUNCTION public.stockwise_get_purchase_orders(
    p_organization_id integer,
    p_order_id bigint DEFAULT NULL,
    p_limit integer DEFAULT 100
)
RETURNS TABLE(
    order_id bigint,
    order_number bigint,
    notes text,
    created_by_email text,
    created_at timestamptz,
    status text,
    item_id bigint,
    product_id integer,
    product_name text,
    sku text,
    quantity_ordered integer,
    unit_price numeric,
    quantity_received integer
)
LANGUAGE sql
STABLE
AS $function$
    WITH selected_orders AS (
        SELECT purchase_order.order_id, purchase_order.order_number
        FROM public.purchase_orders AS purchase_order
        WHERE purchase_order.organization_id = p_organization_id
          AND purchase_order.deleted_at IS NULL
          AND (p_order_id IS NULL OR purchase_order.order_id = p_order_id)
        ORDER BY purchase_order.created_at DESC, purchase_order.order_id DESC
        LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200)
    ),
    order_status AS (
        SELECT item.organization_id, item.order_id,
               CASE
                   WHEN bool_and(item.quantity_received = item.quantity_ordered)
                       THEN 'Received'
                   WHEN bool_or(item.quantity_received > 0)
                       THEN 'Partially received'
                   ELSE 'Open'
               END AS status
        FROM public.purchase_order_items AS item
        JOIN selected_orders AS selected ON selected.order_id = item.order_id
        GROUP BY item.organization_id, item.order_id
    )
    SELECT purchase_order.order_id, purchase_order.order_number,
           purchase_order.notes, purchase_order.created_by_email,
           purchase_order.created_at, order_status.status, item.item_id,
           product.product_id, product.product_name::text, product.sku::text,
           item.quantity_ordered, item.unit_price, item.quantity_received
    FROM selected_orders AS selected
    JOIN public.purchase_orders AS purchase_order
      ON purchase_order.organization_id = p_organization_id
     AND purchase_order.order_id = selected.order_id
    JOIN order_status
      ON order_status.organization_id = purchase_order.organization_id
     AND order_status.order_id = purchase_order.order_id
    JOIN public.purchase_order_items AS item
      ON item.organization_id = purchase_order.organization_id
     AND item.order_id = purchase_order.order_id
    JOIN public.products AS product
      ON product.organization_id = item.organization_id
     AND product.product_id = item.product_id
    ORDER BY purchase_order.created_at DESC, purchase_order.order_id DESC,
             item.item_id;
$function$;

INSERT INTO public.schema_migrations (version, name)
VALUES ('011', 'Purchase order item values')
ON CONFLICT (version) DO NOTHING;

COMMIT;
