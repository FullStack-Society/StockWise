

CREATE OR REPLACE FUNCTION public.stockwise_prevent_delete_open_order_product()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF OLD.is_deleted = false
       AND NEW.is_deleted = true
       AND EXISTS (
           SELECT 1 FROM public.purchase_order_items AS item
           WHERE item.organization_id = OLD.organization_id
             AND item.product_id = OLD.product_id
             AND item.quantity_received < item.quantity_ordered
       ) THEN
        RAISE EXCEPTION
            'This product cannot be deleted while a purchase order has quantity remaining'
            USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_create_inventory_location(
    p_organization_id integer,
    p_location_name text
)
RETURNS TABLE(location_id integer, location_name text, created_at timestamptz)
LANGUAGE plpgsql
AS $function$
BEGIN
    RAISE EXCEPTION
        'This organization uses one business-wide inventory balance'
        USING ERRCODE = '22023';
END;
$function$;

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
           OR COALESCE(v_item->>'product_id', '') !~ '^[1-9][0-9]{0,9}$'
           OR COALESCE(v_item->>'quantity_ordered', '') !~ '^[1-9][0-9]{0,9}$' THEN
            RAISE EXCEPTION 'Each order item needs a valid product and quantity'
                USING ERRCODE = '22023';
        END IF;
        IF (v_item->>'product_id')::numeric > 2147483647
           OR (v_item->>'quantity_ordered')::numeric > 2147483647 THEN
            RAISE EXCEPTION 'Each order item needs a valid product and quantity'
                USING ERRCODE = '22023';
        END IF;
        v_product_id := (v_item->>'product_id')::integer;
        v_quantity := (v_item->>'quantity_ordered')::integer;

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
            organization_id, order_id, product_id, quantity_ordered
        ) VALUES (
            p_organization_id, v_order_id, v_product_id, v_quantity
        );
    END LOOP;

    RETURN v_order_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_get_purchase_orders(
    p_organization_id integer,
    p_order_id bigint DEFAULT NULL,
    p_limit integer DEFAULT 100
)
RETURNS TABLE(
    order_id bigint,
    notes text,
    created_by_email text,
    created_at timestamptz,
    status text,
    item_id bigint,
    product_id integer,
    product_name text,
    sku text,
    quantity_ordered integer,
    quantity_received integer
)
LANGUAGE sql
STABLE
AS $function$
    WITH selected_orders AS (
        SELECT purchase_order.order_id
        FROM public.purchase_orders AS purchase_order
        WHERE purchase_order.organization_id = p_organization_id
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
        JOIN selected_orders AS selected
          ON selected.order_id = item.order_id
        GROUP BY item.organization_id, item.order_id
    )
    SELECT purchase_order.order_id, purchase_order.notes,
           purchase_order.created_by_email, purchase_order.created_at,
           order_status.status, item.item_id, product.product_id,
           product.product_name::text, product.sku::text,
           item.quantity_ordered, item.quantity_received
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
    v_location_id integer;
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

    SELECT item.product_id, item.quantity_ordered, item.quantity_received
    INTO v_product_id, v_ordered, v_received
    FROM public.purchase_order_items AS item
    JOIN public.purchase_orders AS purchase_order
      ON purchase_order.organization_id = item.organization_id
     AND purchase_order.order_id = item.order_id
    JOIN public.products AS product
      ON product.organization_id = item.organization_id
     AND product.product_id = item.product_id
     AND product.is_deleted = false
    WHERE item.organization_id = p_organization_id
      AND item.order_id = p_order_id
      AND item.item_id = p_item_id
    FOR UPDATE OF item;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order item was not found'
            USING ERRCODE = 'P0002';
    END IF;
    IF p_quantity > v_ordered - v_received THEN
        RAISE EXCEPTION 'Receipt quantity exceeds the remaining order quantity'
            USING ERRCODE = '22023';
    END IF;

    SELECT location.location_id INTO v_location_id
    FROM public.inventory_locations AS location
    WHERE location.organization_id = p_organization_id
      AND location.location_name = 'Main Store'
      AND location.is_active = true;
    IF v_location_id IS NULL THEN
        RAISE EXCEPTION 'Business-wide inventory location was not found'
            USING ERRCODE = 'P0002';
    END IF;

    PERFORM public.stockwise_adjust_location_stock(
        p_organization_id,
        p_email,
        v_location_id,
        v_product_id,
        'IN',
        p_quantity,
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
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.organization_memberships AS membership
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
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order was not found'
            USING ERRCODE = 'P0002';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM public.purchase_order_items AS item
        WHERE item.organization_id = p_organization_id
          AND item.order_id = p_order_id
          AND item.quantity_received > 0
    ) THEN
        RAISE EXCEPTION 'A purchase order cannot be edited after receiving items'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.purchase_orders
    SET notes = NULLIF(btrim(p_notes), '')
    WHERE organization_id = p_organization_id
      AND order_id = p_order_id;

    DELETE FROM public.purchase_order_items
    WHERE organization_id = p_organization_id
      AND order_id = p_order_id;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        IF jsonb_typeof(v_item) IS DISTINCT FROM 'object'
           OR jsonb_typeof(v_item->'product_id') IS DISTINCT FROM 'number'
           OR jsonb_typeof(v_item->'quantity_ordered') IS DISTINCT FROM 'number'
           OR COALESCE(v_item->>'product_id', '') !~ '^[1-9][0-9]{0,9}$'
           OR COALESCE(v_item->>'quantity_ordered', '') !~ '^[1-9][0-9]{0,9}$' THEN
            RAISE EXCEPTION 'Each order item needs a valid product and quantity'
                USING ERRCODE = '22023';
        END IF;
        IF (v_item->>'product_id')::numeric > 2147483647
           OR (v_item->>'quantity_ordered')::numeric > 2147483647 THEN
            RAISE EXCEPTION 'Each order item needs a valid product and quantity'
                USING ERRCODE = '22023';
        END IF;

        v_product_id := (v_item->>'product_id')::integer;
        v_quantity := (v_item->>'quantity_ordered')::integer;

        IF EXISTS (
            SELECT 1
            FROM public.purchase_order_items AS item
            WHERE item.organization_id = p_organization_id
              AND item.order_id = p_order_id
              AND item.product_id = v_product_id
        ) THEN
            RAISE EXCEPTION 'A product can only appear once in an order'
                USING ERRCODE = '22023';
        END IF;
        IF NOT EXISTS (
            SELECT 1
            FROM public.products AS product
            WHERE product.organization_id = p_organization_id
              AND product.product_id = v_product_id
              AND product.is_deleted = false
        ) THEN
            RAISE EXCEPTION 'A selected product was not found'
                USING ERRCODE = 'P0002';
        END IF;

        INSERT INTO public.purchase_order_items (
            organization_id, order_id, product_id, quantity_ordered
        ) VALUES (
            p_organization_id, p_order_id, v_product_id, v_quantity
        );
    END LOOP;

    RETURN TRUE;
END;
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
    v_location_id integer;
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

    PERFORM 1
    FROM public.purchase_orders AS purchase_order
    WHERE purchase_order.organization_id = p_organization_id
      AND purchase_order.order_id = p_order_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order was not found'
            USING ERRCODE = 'P0002';
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
        RAISE EXCEPTION 'Purchase order item was not found'
            USING ERRCODE = 'P0002';
    END IF;
    IF p_quantity > v_ordered - v_received THEN
        RAISE EXCEPTION 'Receipt quantity exceeds the remaining order quantity'
            USING ERRCODE = '22023';
    END IF;

    SELECT location.location_id INTO v_location_id
    FROM public.inventory_locations AS location
    WHERE location.organization_id = p_organization_id
      AND location.location_name = 'Main Store'
      AND location.is_active = true;
    IF v_location_id IS NULL THEN
        RAISE EXCEPTION 'Business-wide inventory location was not found'
            USING ERRCODE = 'P0002';
    END IF;

    PERFORM public.stockwise_adjust_location_stock(
        p_organization_id,
        p_email,
        v_location_id,
        v_product_id,
        'IN',
        p_quantity,
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