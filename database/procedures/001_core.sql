

-- Keep the existing stock procedure compatible while enforcing organization scope.
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
    v_current_quantity integer;
    v_is_deleted boolean;
    v_organization_id integer;
    v_transaction_type text;
BEGIN
    v_transaction_type := upper(btrim(p_transaction_type));
    IF v_transaction_type IS NULL OR v_transaction_type NOT IN ('IN', 'OUT') THEN
        RAISE EXCEPTION 'Transaction type must be IN or OUT' USING ERRCODE = '22023';
    END IF;
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Adjustment quantity must be greater than zero' USING ERRCODE = '22023';
    END IF;

    SELECT p.quantity, p.is_deleted, p.organization_id
    INTO v_current_quantity, v_is_deleted, v_organization_id
    FROM public.products AS p
    WHERE p.product_id = p_product_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product does not exist' USING ERRCODE = 'P0002';
    END IF;
    IF v_is_deleted THEN
        RAISE EXCEPTION 'Product has been deleted' USING ERRCODE = 'P0002';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.users AS u
        JOIN public.organization_memberships AS m
          ON lower(m.email) = lower(u.email)
        WHERE u.user_id = p_user_id
          AND m.organization_id = v_organization_id
          AND m.status = 'active'
    ) THEN
        RAISE EXCEPTION 'User is not an active member of this organization'
            USING ERRCODE = '42501';
    END IF;

    IF v_transaction_type = 'OUT' AND v_current_quantity < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for this adjustment' USING ERRCODE = '22023';
    END IF;

    IF v_transaction_type = 'IN' THEN
        UPDATE public.products
        SET quantity = quantity + p_quantity, updated_at = CURRENT_TIMESTAMP
        WHERE product_id = p_product_id
          AND organization_id = v_organization_id
          AND is_deleted = FALSE;
    ELSE
        UPDATE public.products
        SET quantity = quantity - p_quantity, updated_at = CURRENT_TIMESTAMP
        WHERE product_id = p_product_id
          AND organization_id = v_organization_id
          AND is_deleted = FALSE;
    END IF;

    INSERT INTO public.inventory_transactions (
        organization_id, product_id, user_id, transaction_type, quantity, remarks
    ) VALUES (
        v_organization_id, p_product_id, p_user_id,
        v_transaction_type, p_quantity, p_remarks
    );
END;
$procedure$;