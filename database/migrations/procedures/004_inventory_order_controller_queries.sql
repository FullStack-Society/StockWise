

CREATE OR REPLACE PROCEDURE public.stockwise_create_inventory_category(
    IN p_organization_id integer,
    IN p_category_name text,
    OUT o_category_id integer,
    OUT o_category_name text,
    OUT o_description text
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
    INSERT INTO public.categories (
        organization_id, category_name, description
    ) VALUES (
        p_organization_id, p_category_name, NULL
    )
    RETURNING category_id, category_name::text, description::text
    INTO o_category_id, o_category_name, o_description;
END;
$procedure$;

CREATE OR REPLACE PROCEDURE public.stockwise_delete_inventory_category(
    IN p_organization_id integer,
    IN p_category_id integer,
    OUT o_deleted boolean
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
    DELETE FROM public.categories AS category
    WHERE category.organization_id = p_organization_id
      AND category.category_id = p_category_id
    RETURNING true INTO o_deleted;

    IF NOT FOUND THEN
        o_deleted := false;
    END IF;
END;
$procedure$;

CREATE OR REPLACE PROCEDURE public.stockwise_create_inventory(
    IN p_organization_id integer,
    IN p_product_name text,
    IN p_sku text,
    IN p_category_id integer,
    IN p_description text,
    IN p_price numeric,
    IN p_quantity integer,
    IN p_reorder_point integer,
    IN p_actor_email text,
    IN p_variant text,
    IN p_upc text,
    OUT o_product_id integer
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
    SELECT inventory.product_id
    INTO o_product_id
    FROM public.organization_create_inventory(
        p_organization_id,
        p_product_name,
        p_sku,
        p_category_id,
        p_description,
        p_price,
        p_quantity,
        p_reorder_point,
        p_actor_email
    ) AS inventory;

    UPDATE public.products AS product
    SET variant = p_variant, upc = p_upc
    WHERE product.organization_id = p_organization_id
      AND product.product_id = o_product_id;
END;
$procedure$;

CREATE OR REPLACE PROCEDURE public.stockwise_update_inventory(
    IN p_organization_id integer,
    IN p_product_id integer,
    IN p_product_name text,
    IN p_sku text,
    IN p_category_id integer,
    IN p_description text,
    IN p_price numeric,
    IN p_quantity integer,
    IN p_reorder_point integer,
    IN p_has_variant boolean,
    IN p_variant text,
    IN p_has_upc boolean,
    IN p_upc text
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_product_id integer;
BEGIN
    SELECT inventory.product_id
    INTO v_product_id
    FROM public.organization_update_inventory(
        p_organization_id,
        p_product_id,
        p_product_name,
        p_sku,
        p_category_id,
        p_description,
        p_price,
        p_quantity,
        p_reorder_point
    ) AS inventory;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF p_has_variant OR p_has_upc THEN
        UPDATE public.products AS product
        SET variant = CASE WHEN p_has_variant THEN p_variant ELSE product.variant END,
            upc = CASE WHEN p_has_upc THEN p_upc ELSE product.upc END
        WHERE product.organization_id = p_organization_id
          AND product.product_id = p_product_id;
    END IF;
END;
$procedure$;

CREATE OR REPLACE PROCEDURE public.stockwise_delete_inventory(
    IN p_organization_id integer,
    IN p_product_id integer,
    OUT o_deleted boolean
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
    o_deleted := public.organization_delete_inventory(
        p_organization_id, p_product_id
    );
END;
$procedure$;

CREATE OR REPLACE PROCEDURE public.stockwise_adjust_inventory_stock_write(
    IN p_organization_id integer,
    IN p_email text,
    IN p_product_id integer,
    IN p_transaction_type text,
    IN p_quantity integer,
    IN p_remarks text,
    OUT o_quantity integer
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
    o_quantity := public.stockwise_adjust_inventory_stock(
        p_organization_id,
        p_email,
        p_product_id,
        p_transaction_type,
        p_quantity,
        p_remarks
    );
END;
$procedure$;

CREATE OR REPLACE PROCEDURE public.stockwise_record_stocktake_write(
    IN p_organization_id integer,
    IN p_email text,
    IN p_product_id integer,
    IN p_counted_quantity integer,
    IN p_remarks text,
    OUT o_quantity integer
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
    o_quantity := public.stockwise_record_stocktake(
        p_organization_id,
        p_email,
        p_product_id,
        p_counted_quantity,
        p_remarks
    );
END;
$procedure$;

CREATE OR REPLACE PROCEDURE public.stockwise_create_purchase_order_write(
    IN p_organization_id integer,
    IN p_email text,
    IN p_notes text,
    IN p_items jsonb,
    OUT o_order_id bigint
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
    o_order_id := public.stockwise_create_purchase_order(
        p_organization_id, p_email, p_notes, p_items
    );
END;
$procedure$;

CREATE OR REPLACE PROCEDURE public.stockwise_update_purchase_order_write(
    IN p_organization_id integer,
    IN p_email text,
    IN p_order_id bigint,
    IN p_notes text,
    IN p_items jsonb
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
    PERFORM set_config('app.actor_email', p_email, true);
    PERFORM public.stockwise_update_purchase_order(
        p_organization_id, p_email, p_order_id, p_notes, p_items
    );
END;
$procedure$;

CREATE OR REPLACE PROCEDURE public.stockwise_delete_purchase_order_write(
    IN p_organization_id integer,
    IN p_email text,
    IN p_order_id bigint
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
    PERFORM set_config('app.actor_email', p_email, true);
    PERFORM public.stockwise_delete_purchase_order(
        p_organization_id, p_email, p_order_id
    );
END;
$procedure$;

CREATE OR REPLACE PROCEDURE public.stockwise_receive_purchase_order_item_write(
    IN p_organization_id integer,
    IN p_email text,
    IN p_order_id bigint,
    IN p_item_id bigint,
    IN p_quantity integer
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
    PERFORM set_config('app.actor_email', p_email, true);
    PERFORM public.stockwise_receive_purchase_order_item(
        p_organization_id, p_email, p_order_id, p_item_id, p_quantity
    );
END;
$procedure$;