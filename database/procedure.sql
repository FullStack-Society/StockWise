
-- ==============================================
-- STOCKWISE STOCK ADJUSTMENT PROCEDURE
-- ==============================================

CREATE OR REPLACE PROCEDURE adjust_inventory_stock(
    p_product_id INTEGER,
    p_user_id INTEGER,
    p_transaction_type TEXT,
    p_quantity INTEGER,
    p_remarks TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_quantity INTEGER;
    v_transaction_type TEXT;
BEGIN
    -- Normalize transaction type
    v_transaction_type :=
        UPPER(BTRIM(p_transaction_type));

    -- Validate transaction type
    IF v_transaction_type IS NULL
       OR v_transaction_type NOT IN ('IN', 'OUT') THEN
        RAISE EXCEPTION
            'Transaction type must be IN or OUT'
            USING ERRCODE = '22023';
    END IF;

    -- Validate quantity
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION
            'Adjustment quantity must be greater than zero'
            USING ERRCODE = '22023';
    END IF;

    -- Validate user
    IF NOT EXISTS (
        SELECT 1
        FROM users AS u
        WHERE u.user_id = p_user_id
    ) THEN
        RAISE EXCEPTION
            'User does not exist'
            USING ERRCODE = '23503';
    END IF;

    -- Lock product row
    SELECT p.quantity
    INTO v_current_quantity
    FROM products AS p
    WHERE p.product_id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Product does not exist'
            USING ERRCODE = 'P0002';
    END IF;

    -- Prevent negative stock
    IF v_transaction_type = 'OUT'
       AND v_current_quantity < p_quantity THEN
        RAISE EXCEPTION
            'Insufficient stock for this adjustment'
            USING ERRCODE = '22023';
    END IF;

    -- Update quantity
    IF v_transaction_type = 'IN' THEN
        UPDATE products
        SET
            quantity = quantity + p_quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = p_product_id;
    ELSE
        UPDATE products
        SET
            quantity = quantity - p_quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = p_product_id;
    END IF;

    -- Record transaction history
    INSERT INTO inventory_transactions (
        product_id,
        user_id,
        transaction_type,
        quantity,
        remarks
    )
    VALUES (
        p_product_id,
        p_user_id,
        v_transaction_type,
        p_quantity,
        p_remarks
    );
END;
$$;
