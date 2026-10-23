
-- =========================================
-- STOCKWISE STORED PROCEDURES
-- =========================================

-- 1. MAIN INVENTORY MOVEMENT PROCEDURE

CREATE OR REPLACE PROCEDURE apply_inventory_movement(
    p_product_id INT,
    p_user_id INT,
    p_type VARCHAR,
    p_quantity INT,
    p_remarks TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION
            'Quantity must be greater than zero';
    END IF;

    IF p_type IS NULL OR p_type NOT IN (
        'STOCK_IN',
        'STOCK_OUT',
        'ADJUSTMENT_IN',
        'ADJUSTMENT_OUT'
    ) THEN
        RAISE EXCEPTION
            'Invalid transaction type';
    END IF;

    -- Increase stock
    IF p_type IN ('STOCK_IN', 'ADJUSTMENT_IN') THEN

        UPDATE products
        SET quantity = quantity + p_quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = p_product_id;

    -- Decrease stock
    ELSE

        UPDATE products
        SET quantity = quantity - p_quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = p_product_id
          AND quantity >= p_quantity;

    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Product not found or insufficient stock';
    END IF;

    -- Record stock movement
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
        p_type,
        p_quantity,
        p_remarks
    );
END;
$$;


-- 2. STOCK IN PROCEDURE

CREATE OR REPLACE PROCEDURE stock_in(
    p_product_id INT,
    p_user_id INT,
    p_quantity INT,
    p_remarks TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    CALL apply_inventory_movement(
        p_product_id,
        p_user_id,
        'STOCK_IN',
        p_quantity,
        p_remarks
    );
END;
$$;


-- 3. STOCK OUT PROCEDURE

CREATE OR REPLACE PROCEDURE stock_out(
    p_product_id INT,
    p_user_id INT,
    p_quantity INT,
    p_remarks TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    CALL apply_inventory_movement(
        p_product_id,
        p_user_id,
        'STOCK_OUT',
        p_quantity,
        p_remarks
    );
END;
$$;


-- 4. STOCK ADJUSTMENT PROCEDURE

CREATE OR REPLACE PROCEDURE adjust_stock(
    p_product_id INT,
    p_user_id INT,
    p_new_quantity INT,
    p_remarks TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_old_quantity INT;
    v_difference INT;
BEGIN
    IF p_new_quantity IS NULL OR p_new_quantity < 0 THEN
        RAISE EXCEPTION
            'Stock cannot be negative';
    END IF;

    SELECT quantity
    INTO v_old_quantity
    FROM products
    WHERE product_id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    v_difference := p_new_quantity - v_old_quantity;

    IF v_difference > 0 THEN

        CALL apply_inventory_movement(
            p_product_id,
            p_user_id,
            'ADJUSTMENT_IN',
            v_difference,
            p_remarks
        );

    ELSIF v_difference < 0 THEN

        CALL apply_inventory_movement(
            p_product_id,
            p_user_id,
            'ADJUSTMENT_OUT',
            ABS(v_difference),
            p_remarks
        );

    END IF;
END;
$$;
