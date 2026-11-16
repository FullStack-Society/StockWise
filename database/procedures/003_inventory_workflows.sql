

CREATE OR REPLACE PROCEDURE public.adjust_inventory_stock(
    IN p_product_id integer,
    IN p_user_id integer,
    IN p_transaction_type text,
    IN p_quantity integer,
    IN p_remarks text DEFAULT NULL
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_organization_id integer;
    v_email text;
    v_location_id integer;
BEGIN
    SELECT p.organization_id INTO v_organization_id
    FROM public.products AS p
    WHERE p.product_id = p_product_id AND p.is_deleted = false;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product was not found' USING ERRCODE = 'P0002';
    END IF;

    SELECT lower(u.email) INTO v_email
    FROM public.users AS u
    WHERE u.user_id = p_user_id;
    IF v_email IS NULL THEN
        RAISE EXCEPTION 'User was not found' USING ERRCODE = '42501';
    END IF;

    SELECT l.location_id INTO v_location_id
    FROM public.inventory_locations AS l
    WHERE l.organization_id = v_organization_id
      AND l.location_name = 'Main Store'
      AND l.is_active = true;
    IF v_location_id IS NULL THEN
        RAISE EXCEPTION 'Default inventory location was not found'
            USING ERRCODE = 'P0002';
    END IF;

    PERFORM public.stockwise_adjust_location_stock(
        v_organization_id,
        v_email,
        v_location_id,
        p_product_id,
        p_transaction_type,
        p_quantity,
        COALESCE(NULLIF(btrim(p_remarks), ''), 'Legacy stock adjustment')
    );
END;
$procedure$;