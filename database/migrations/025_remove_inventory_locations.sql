BEGIN;

-- Flatten the single inventory balance into products before removing location tables.
DO $migration$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.products AS p
        LEFT JOIN public.inventory_location_stock AS s
          ON s.organization_id = p.organization_id
         AND s.product_id = p.product_id
        WHERE p.is_deleted = false
        GROUP BY p.organization_id, p.product_id
        HAVING count(s.product_id) = 0
            OR sum(s.quantity)::bigint > 2147483647
            OR sum(s.reorder_point)::bigint > 2147483647
    ) THEN
        RAISE EXCEPTION
            'Location inventory cannot be flattened safely; an active product is missing stock or a total exceeds the supported range';
    END IF;
    IF EXISTS (SELECT 1 FROM public.inventory_location_transfers) THEN
        RAISE EXCEPTION
            'Location transfers exist; archive or convert them before removing inventory locations';
    END IF;
END;
$migration$;

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS reorder_point integer NOT NULL DEFAULT 50;
ALTER TABLE public.products
    DROP CONSTRAINT IF EXISTS ck_products_reorder_point;
ALTER TABLE public.products
    ADD CONSTRAINT ck_products_reorder_point CHECK (reorder_point >= 0);

WITH stock_totals AS (
    SELECT organization_id, product_id,
           sum(quantity)::integer AS quantity,
           sum(reorder_point)::integer AS reorder_point
    FROM public.inventory_location_stock
    GROUP BY organization_id, product_id
)
UPDATE public.products AS p
SET quantity = stock_totals.quantity,
    reorder_point = stock_totals.reorder_point
FROM stock_totals
WHERE stock_totals.organization_id = p.organization_id
  AND stock_totals.product_id = p.product_id;

-- Delete organization no longer depends on location-specific tables.
CREATE OR REPLACE FUNCTION public.org_delete_organization(
    p_organization_id integer,
    p_actor_email text
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
    v_actor_role text;
    v_actor_email text := lower(btrim(p_actor_email));
BEGIN
    SELECT membership.role INTO v_actor_role
    FROM public.organization_memberships AS membership
    WHERE membership.organization_id = p_organization_id
      AND lower(membership.email) = v_actor_email
      AND membership.status = 'active'
    FOR UPDATE;

    IF v_actor_role IS DISTINCT FROM 'owner' THEN
        RAISE EXCEPTION 'Only the organization owner can delete it'
            USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.inventory_transactions
    WHERE organization_id = p_organization_id;
    DELETE FROM public.inventory_stocktakes
    WHERE organization_id = p_organization_id;
    DELETE FROM public.purchase_order_items
    WHERE organization_id = p_organization_id;
    DELETE FROM public.purchase_orders
    WHERE organization_id = p_organization_id;
    DELETE FROM public.products
    WHERE organization_id = p_organization_id;
    DELETE FROM public.categories
    WHERE organization_id = p_organization_id;
    DELETE FROM public.organization_leave_notifications
    WHERE organization_id = p_organization_id;
    DELETE FROM public.organization_invitations
    WHERE organization_id = p_organization_id;
    DELETE FROM public.organization_memberships
    WHERE organization_id = p_organization_id;
    DELETE FROM public.organizations
    WHERE organization_id = p_organization_id;

    RETURN FOUND;
END;
$function$;

DROP TRIGGER IF EXISTS trg_stockwise_create_default_location
    ON public.organizations;

DROP FUNCTION IF EXISTS public.organization_get_inventory(
    integer, text, integer, text, integer
);
DROP FUNCTION IF EXISTS public.organization_get_inventory_by_id(
    integer, integer, integer
);
DROP FUNCTION IF EXISTS public.organization_create_inventory(
    integer, text, text, integer, text, numeric, integer, integer, integer, text
);
DROP FUNCTION IF EXISTS public.organization_update_inventory(
    integer, integer, text, text, integer, text, numeric, integer, integer, integer
);
DROP FUNCTION IF EXISTS public.stockwise_adjust_location_stock(
    integer, text, integer, integer, text, integer, text
);
DROP FUNCTION IF EXISTS public.stockwise_record_stocktake(
    integer, text, integer, integer, integer, text
);
DROP FUNCTION IF EXISTS public.stockwise_transfer_location_stock(
    integer, text, integer, integer, integer, integer, text
);
DROP FUNCTION IF EXISTS public.stockwise_get_inventory_history(
    integer, integer, integer, integer
);
DROP FUNCTION IF EXISTS public.stockwise_get_inventory_locations(integer);
DROP FUNCTION IF EXISTS public.stockwise_create_inventory_location(integer, text);
DROP FUNCTION IF EXISTS public.stockwise_create_default_location();
DROP FUNCTION IF EXISTS public.stockwise_get_reorder_summary(integer);
DROP PROCEDURE IF EXISTS public.adjust_inventory_stock(
    integer, integer, text, integer, text
);

CREATE OR REPLACE FUNCTION public.stockwise_inventory_status(
    p_quantity integer, p_reorder_point integer
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
    SELECT CASE
        WHEN p_quantity <= 0 THEN 'Critical'
        WHEN p_quantity <= p_reorder_point THEN 'Low stock'
        ELSE 'In stock'
    END;
$function$;

CREATE FUNCTION public.organization_get_inventory(
    p_organization_id integer,
    p_search text DEFAULT NULL,
    p_category_id integer DEFAULT NULL,
    p_stock_status text DEFAULT NULL
)
RETURNS TABLE(
    product_id integer, product_name text, sku text, category_id integer,
    description text, price numeric, quantity integer, reorder_point integer,
    created_at timestamptz, updated_at timestamptz,
    category_name text, status text
)
LANGUAGE sql
STABLE
AS $function$
    SELECT p.product_id, p.product_name::text, p.sku::text, p.category_id,
           p.description::text, p.price, p.quantity, p.reorder_point,
           p.created_at, p.updated_at, c.category_name::text,
           public.stockwise_inventory_status(p.quantity, p.reorder_point)
    FROM public.products AS p
    LEFT JOIN public.categories AS c
      ON c.organization_id = p.organization_id
     AND c.category_id = p.category_id
    WHERE p.organization_id = p_organization_id
      AND p.is_deleted = false
      AND (NULLIF(btrim(p_search), '') IS NULL
           OR p.product_name ILIKE '%' || btrim(p_search) || '%'
           OR p.sku ILIKE '%' || btrim(p_search) || '%')
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (NULLIF(btrim(p_stock_status), '') IS NULL
           OR public.stockwise_inventory_status(p.quantity, p.reorder_point)
              = btrim(p_stock_status))
    ORDER BY p.product_id DESC;
$function$;

CREATE FUNCTION public.organization_get_inventory_by_id(
    p_organization_id integer,
    p_product_id integer
)
RETURNS TABLE(
    product_id integer, product_name text, sku text, category_id integer,
    description text, price numeric, quantity integer, reorder_point integer,
    created_at timestamptz, updated_at timestamptz,
    category_name text, status text
)
LANGUAGE sql
STABLE
AS $function$
    SELECT p.product_id, p.product_name::text, p.sku::text, p.category_id,
           p.description::text, p.price, p.quantity, p.reorder_point,
           p.created_at, p.updated_at, c.category_name::text,
           public.stockwise_inventory_status(p.quantity, p.reorder_point)
    FROM public.products AS p
    LEFT JOIN public.categories AS c
      ON c.organization_id = p.organization_id
     AND c.category_id = p.category_id
    WHERE p.organization_id = p_organization_id
      AND p.product_id = p_product_id
      AND p.is_deleted = false;
$function$;

CREATE FUNCTION public.organization_create_inventory(
    p_organization_id integer,
    p_product_name text,
    p_sku text,
    p_category_id integer,
    p_description text,
    p_price numeric,
    p_quantity integer,
    p_reorder_point integer,
    p_actor_email text
)
RETURNS TABLE(
    product_id integer, product_name text, sku text, category_id integer,
    description text, price numeric, quantity integer, reorder_point integer,
    created_at timestamptz, updated_at timestamptz,
    category_name text, status text
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_product_id integer;
    v_user_id integer;
BEGIN
    IF NULLIF(btrim(p_product_name), '') IS NULL
       OR NULLIF(btrim(p_sku), '') IS NULL THEN
        RAISE EXCEPTION 'Product name and SKU are required'
            USING ERRCODE = '22023';
    END IF;
    IF p_price IS NULL OR p_quantity IS NULL OR p_reorder_point IS NULL
       OR p_price < 0 OR p_quantity < 0 OR p_reorder_point < 0 THEN
        RAISE EXCEPTION
            'Price, quantity, and reorder point must be non-negative'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.products (
        organization_id, product_name, sku, category_id, description,
        price, quantity, reorder_point
    ) VALUES (
        p_organization_id, btrim(p_product_name), btrim(p_sku), p_category_id,
        p_description, p_price, p_quantity, p_reorder_point
    ) RETURNING products.product_id INTO v_product_id;

    SELECT u.user_id INTO v_user_id
    FROM public.users AS u
    WHERE lower(u.email) = lower(btrim(p_actor_email))
    ORDER BY u.user_id LIMIT 1;

    IF p_quantity > 0 THEN
        INSERT INTO public.inventory_transactions (
            organization_id, product_id, user_id, actor_email,
            transaction_type, quantity, remarks
        ) VALUES (
            p_organization_id, v_product_id, v_user_id,
            lower(btrim(p_actor_email)), 'IN', p_quantity, 'Opening stock'
        );
    END IF;

    RETURN QUERY SELECT * FROM public.organization_get_inventory_by_id(
        p_organization_id, v_product_id
    );
END;
$function$;

CREATE FUNCTION public.organization_update_inventory(
    p_organization_id integer,
    p_product_id integer,
    p_product_name text,
    p_sku text,
    p_category_id integer,
    p_description text,
    p_price numeric,
    p_quantity integer,
    p_reorder_point integer
)
RETURNS TABLE(
    product_id integer, product_name text, sku text, category_id integer,
    description text, price numeric, quantity integer, reorder_point integer,
    created_at timestamptz, updated_at timestamptz,
    category_name text, status text
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_old_quantity integer;
BEGIN
    IF NULLIF(btrim(p_product_name), '') IS NULL
       OR NULLIF(btrim(p_sku), '') IS NULL THEN
        RAISE EXCEPTION 'Product name and SKU are required'
            USING ERRCODE = '22023';
    END IF;
    IF p_price IS NULL OR p_quantity IS NULL OR p_reorder_point IS NULL
       OR p_price < 0 OR p_quantity < 0 OR p_reorder_point < 0 THEN
        RAISE EXCEPTION
            'Price, quantity, and reorder point must be non-negative'
            USING ERRCODE = '22023';
    END IF;

    SELECT p.quantity INTO v_old_quantity
    FROM public.products AS p
    WHERE p.organization_id = p_organization_id
      AND p.product_id = p_product_id
      AND p.is_deleted = false
    FOR UPDATE;
    IF NOT FOUND THEN RETURN; END IF;

    UPDATE public.products AS p
    SET product_name = btrim(p_product_name), sku = btrim(p_sku),
        category_id = p_category_id, description = p_description,
        price = p_price, quantity = p_quantity,
        reorder_point = p_reorder_point, updated_at = CURRENT_TIMESTAMP
    WHERE p.organization_id = p_organization_id
      AND p.product_id = p_product_id
      AND p.is_deleted = false;

    IF p_quantity <> v_old_quantity THEN
        INSERT INTO public.inventory_transactions (
            organization_id, product_id, user_id, actor_email,
            transaction_type, quantity, remarks
        ) VALUES (
            p_organization_id, p_product_id, NULL, 'Unknown',
            CASE WHEN p_quantity > v_old_quantity THEN 'IN' ELSE 'OUT' END,
            abs(p_quantity - v_old_quantity), 'Product quantity updated'
        );
    END IF;

    RETURN QUERY SELECT * FROM public.organization_get_inventory_by_id(
        p_organization_id, p_product_id
    );
END;
$function$;

CREATE FUNCTION public.stockwise_adjust_inventory_stock(
    p_organization_id integer,
    p_email text,
    p_product_id integer,
    p_transaction_type text,
    p_quantity integer,
    p_remarks text
)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    v_type text := upper(btrim(p_transaction_type));
    v_quantity integer;
    v_user_id integer;
BEGIN
    IF v_type NOT IN ('IN', 'OUT', 'ADJUST') THEN
        RAISE EXCEPTION 'Transaction type must be IN, OUT, or ADJUST'
            USING ERRCODE = '22023';
    END IF;
    IF p_quantity IS NULL
       OR (v_type = 'ADJUST' AND p_quantity = 0)
       OR (v_type <> 'ADJUST' AND p_quantity <= 0) THEN
        RAISE EXCEPTION 'Quantity must be non-zero, and movements must be positive'
            USING ERRCODE = '22023';
    END IF;
    IF NULLIF(btrim(p_remarks), '') IS NULL
       OR length(btrim(p_remarks)) > 500 THEN
        RAISE EXCEPTION 'A reason of up to 500 characters is required'
            USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.organization_memberships AS m
        WHERE m.organization_id = p_organization_id
          AND lower(m.email) = lower(btrim(p_email))
          AND m.status = 'active'
    ) THEN
        RAISE EXCEPTION 'User is not an active member of this organization'
            USING ERRCODE = '42501';
    END IF;

    SELECT p.quantity INTO v_quantity
    FROM public.products AS p
    WHERE p.organization_id = p_organization_id
      AND p.product_id = p_product_id
      AND p.is_deleted = false
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product was not found' USING ERRCODE = 'P0002';
    END IF;
    IF (v_type = 'OUT' OR (v_type = 'ADJUST' AND p_quantity < 0))
       AND v_quantity < abs(p_quantity) THEN
        RAISE EXCEPTION 'Insufficient stock for this movement'
            USING ERRCODE = '22023';
    END IF;
    IF (v_type = 'IN' OR (v_type = 'ADJUST' AND p_quantity > 0))
       AND v_quantity > 2147483647 - p_quantity THEN
        RAISE EXCEPTION 'Inventory quantity would exceed the supported limit'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.products AS p
    SET quantity = CASE
            WHEN v_type = 'OUT' THEN p.quantity - p_quantity
            ELSE p.quantity + p_quantity
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE p.organization_id = p_organization_id
      AND p.product_id = p_product_id
      AND p.is_deleted = false
    RETURNING p.quantity INTO v_quantity;

    SELECT u.user_id INTO v_user_id
    FROM public.users AS u
    WHERE lower(u.email) = lower(btrim(p_email))
    ORDER BY u.user_id LIMIT 1;

    INSERT INTO public.inventory_transactions (
        organization_id, product_id, user_id, actor_email,
        transaction_type, quantity, remarks
    ) VALUES (
        p_organization_id, p_product_id, v_user_id, lower(btrim(p_email)),
        CASE WHEN v_type = 'ADJUST'
             THEN CASE WHEN p_quantity > 0 THEN 'IN' ELSE 'OUT' END
             ELSE v_type END,
        abs(p_quantity),
        CASE WHEN v_type = 'ADJUST'
             THEN 'Adjustment: ' || btrim(p_remarks)
             ELSE btrim(p_remarks) END
    );
    RETURN v_quantity;
END;
$function$;

CREATE FUNCTION public.stockwise_record_stocktake(
    p_organization_id integer,
    p_email text,
    p_product_id integer,
    p_counted_quantity integer,
    p_remarks text
)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    v_expected integer;
    v_delta integer;
    v_stocktake_id bigint;
    v_user_id integer;
BEGIN
    IF p_counted_quantity IS NULL OR p_counted_quantity < 0 THEN
        RAISE EXCEPTION 'Counted quantity must be zero or greater'
            USING ERRCODE = '22023';
    END IF;
    IF NULLIF(btrim(p_remarks), '') IS NULL
       OR length(btrim(p_remarks)) > 500 THEN
        RAISE EXCEPTION 'A stocktake note of up to 500 characters is required'
            USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.organization_memberships AS m
        WHERE m.organization_id = p_organization_id
          AND lower(m.email) = lower(btrim(p_email))
          AND m.status = 'active'
    ) THEN
        RAISE EXCEPTION 'User is not an active member of this organization'
            USING ERRCODE = '42501';
    END IF;

    SELECT p.quantity INTO v_expected
    FROM public.products AS p
    WHERE p.organization_id = p_organization_id
      AND p.product_id = p_product_id
      AND p.is_deleted = false
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product was not found' USING ERRCODE = 'P0002';
    END IF;

    v_delta := p_counted_quantity - v_expected;
    INSERT INTO public.inventory_stocktakes (
        organization_id, product_id, expected_quantity, counted_quantity,
        actor_email, remarks
    ) VALUES (
        p_organization_id, p_product_id, v_expected, p_counted_quantity,
        lower(btrim(p_email)), btrim(p_remarks)
    ) RETURNING stocktake_id INTO v_stocktake_id;

    IF v_delta <> 0 THEN
        UPDATE public.products AS p
        SET quantity = p_counted_quantity, updated_at = CURRENT_TIMESTAMP
        WHERE p.organization_id = p_organization_id
          AND p.product_id = p_product_id;

        SELECT u.user_id INTO v_user_id
        FROM public.users AS u
        WHERE lower(u.email) = lower(btrim(p_email))
        ORDER BY u.user_id LIMIT 1;

        INSERT INTO public.inventory_transactions (
            organization_id, product_id, user_id, actor_email,
            transaction_type, quantity, remarks
        ) VALUES (
            p_organization_id, p_product_id, v_user_id,
            lower(btrim(p_email)),
            CASE WHEN v_delta > 0 THEN 'IN' ELSE 'OUT' END,
            abs(v_delta),
            format('stocktake:%s %s', v_stocktake_id, btrim(p_remarks))
        );
    END IF;
    RETURN p_counted_quantity;
END;
$function$;

CREATE FUNCTION public.stockwise_get_inventory_history(
    p_organization_id integer,
    p_product_id integer DEFAULT NULL,
    p_limit integer DEFAULT 100
)
RETURNS TABLE(
    movement_id bigint,
    occurred_at timestamptz,
    transaction_type text,
    product_id integer,
    product_name text,
    sku text,
    quantity integer,
    expected_quantity integer,
    counted_quantity integer,
    actor_email text,
    remarks text
)
LANGUAGE sql
STABLE
AS $function$
    WITH events AS (
        SELECT public.stockwise_transaction_timestamp(t) AS occurred_at,
               CASE
                   WHEN upper(t.transaction_type) IN ('IN', 'STOCK_IN') THEN 'IN'
                   WHEN upper(t.transaction_type) IN ('OUT', 'STOCK_OUT') THEN 'OUT'
                   ELSE 'OTHER'
               END::text AS transaction_type,
               t.product_id, p.product_name::text, p.sku::text,
               t.quantity, NULL::integer AS expected_quantity,
               NULL::integer AS counted_quantity,
               COALESCE(t.actor_email, 'Unknown')::text AS actor_email,
               t.remarks::text
        FROM public.inventory_transactions AS t
        JOIN public.products AS p
          ON p.organization_id = t.organization_id
         AND p.product_id = t.product_id
        WHERE t.organization_id = p_organization_id
          AND (p_product_id IS NULL OR t.product_id = p_product_id)
          AND COALESCE(t.remarks, '') NOT LIKE 'stocktake:%'
        UNION ALL
        SELECT st.created_at, 'STOCKTAKE'::text,
               st.product_id, p.product_name::text, p.sku::text,
               abs(st.counted_quantity - st.expected_quantity),
               st.expected_quantity, st.counted_quantity,
               st.actor_email::text, st.remarks::text
        FROM public.inventory_stocktakes AS st
        JOIN public.products AS p
          ON p.organization_id = st.organization_id
         AND p.product_id = st.product_id
        WHERE st.organization_id = p_organization_id
          AND (p_product_id IS NULL OR st.product_id = p_product_id)
    ),
    recent AS (
        SELECT * FROM events
        ORDER BY occurred_at DESC, product_id DESC
        LIMIT LEAST(GREATEST(p_limit, 1), 200)
    )
    SELECT row_number() OVER (
               ORDER BY recent.occurred_at DESC, recent.product_id DESC
           ),
           recent.occurred_at, recent.transaction_type,
           recent.product_id, recent.product_name, recent.sku,
           recent.quantity, recent.expected_quantity, recent.counted_quantity,
           recent.actor_email, recent.remarks
    FROM recent
    ORDER BY recent.occurred_at DESC, recent.product_id DESC;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_receive_purchase_order_item(
    p_organization_id integer,
    p_email text,
    p_order_id bigint,
    p_item_id bigint,
    p_quantity integer
)
RETURNS TABLE(quantity_received integer, quantity_remaining integer)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_product_id integer;
    v_ordered integer;
    v_received integer;
    v_stock integer;
    v_user_id integer;
BEGIN
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Receipt quantity must be greater than zero'
            USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.organization_memberships AS membership
        WHERE membership.organization_id = p_organization_id
          AND lower(membership.email) = lower(btrim(p_email))
          AND membership.status = 'active'
    ) THEN
        RAISE EXCEPTION 'User is not an active member of this organization'
            USING ERRCODE = '42501';
    END IF;

    PERFORM 1 FROM public.purchase_orders AS purchase_order
    WHERE purchase_order.organization_id = p_organization_id
      AND purchase_order.order_id = p_order_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order was not found' USING ERRCODE = 'P0002';
    END IF;

    SELECT item.product_id, item.quantity_ordered, item.quantity_received
    INTO v_product_id, v_ordered, v_received
    FROM public.purchase_order_items AS item
    JOIN public.products AS product
      ON product.organization_id = item.organization_id
     AND product.product_id = item.product_id
     AND product.is_deleted = false
    WHERE item.organization_id = p_organization_id
      AND item.order_id = p_order_id
      AND item.item_id = p_item_id
    FOR UPDATE OF item;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order item was not found' USING ERRCODE = 'P0002';
    END IF;
    IF p_quantity > v_ordered - v_received THEN
        RAISE EXCEPTION 'Receipt quantity exceeds the remaining order quantity'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.products AS product
    SET quantity = product.quantity + p_quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE product.organization_id = p_organization_id
      AND product.product_id = v_product_id
      AND product.is_deleted = false
      AND product.quantity <= 2147483647 - p_quantity
    RETURNING product.quantity INTO v_stock;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory quantity would exceed the supported limit'
            USING ERRCODE = '22023';
    END IF;

    SELECT u.user_id INTO v_user_id
    FROM public.users AS u
    WHERE lower(u.email) = lower(btrim(p_email))
    ORDER BY u.user_id LIMIT 1;
    INSERT INTO public.inventory_transactions (
        organization_id, product_id, user_id, actor_email,
        transaction_type, quantity, remarks
    ) VALUES (
        p_organization_id, v_product_id, v_user_id,
        lower(btrim(p_email)), 'IN', p_quantity,
        format('Purchase order #%s received', p_order_id)
    );

    v_received := v_received + p_quantity;
    UPDATE public.purchase_order_items AS item
    SET quantity_received = v_received
    WHERE item.organization_id = p_organization_id
      AND item.order_id = p_order_id
      AND item.item_id = p_item_id;

    RETURN QUERY SELECT v_received, v_ordered - v_received;
END;
$function$;

ALTER TABLE public.inventory_transactions
    DROP CONSTRAINT IF EXISTS fk_inventory_transactions_location,
    DROP COLUMN IF EXISTS location_id;

ALTER TABLE public.inventory_stocktakes
    DROP CONSTRAINT IF EXISTS fk_stocktakes_location;
DROP INDEX IF EXISTS public.ix_inventory_stocktakes_location_created;
ALTER TABLE public.inventory_stocktakes
    DROP COLUMN IF EXISTS location_id;

DROP TABLE public.inventory_location_transfers;
DROP TABLE public.inventory_location_stock;
DROP TABLE public.inventory_locations;

INSERT INTO public.schema_migrations (version, name)
VALUES ('025', 'Remove inventory locations and flatten stock balances')
ON CONFLICT (version) DO NOTHING;

COMMIT;
