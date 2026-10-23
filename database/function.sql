
-- =========================================
-- STOCKWISE DATABASE FUNCTIONS
-- =========================================

-- 1. CHECK PRODUCT STOCK STATUS

CREATE OR REPLACE FUNCTION get_stock_status(
    p_product_id INT
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_quantity INT;
    v_minimum INT;
BEGIN
    SELECT quantity, minimum_stock
    INTO v_quantity, v_minimum
    FROM products
    WHERE product_id = p_product_id;

    IF NOT FOUND THEN
        RETURN 'PRODUCT NOT FOUND';
    ELSIF v_quantity = 0 THEN
        RETURN 'OUT OF STOCK';
    ELSIF v_quantity <= v_minimum THEN
        RETURN 'LOW STOCK';
    ELSE
        RETURN 'IN STOCK';
    END IF;
END;
$$;


-- 2. CALCULATE TOTAL INVENTORY VALUE

CREATE OR REPLACE FUNCTION get_inventory_value()
RETURNS NUMERIC(16,2)
LANGUAGE SQL
STABLE
AS $$
    SELECT COALESCE(
        SUM(price * quantity),
        0
    )::NUMERIC(16,2)
    FROM products;
$$;


-- 3. GET INVENTORY TRANSACTION HISTORY

CREATE OR REPLACE FUNCTION get_transaction_history()
RETURNS TABLE (
    transaction_id INT,
    product_name VARCHAR(150),
    performed_by VARCHAR(100),
    transaction_type VARCHAR(20),
    quantity INT,
    remarks TEXT,
    transaction_date TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        t.transaction_id,
        p.product_name,
        u.full_name,
        t.transaction_type,
        t.quantity,
        t.remarks,
        t.transaction_date
    FROM inventory_transactions t
    JOIN products p
        ON t.product_id = p.product_id
    JOIN users u
        ON t.user_id = u.user_id
    ORDER BY t.transaction_date DESC,
             t.transaction_id DESC;
$$;


-- 4. AUTOMATIC PRODUCT TIMESTAMP FUNCTION

CREATE OR REPLACE FUNCTION update_product_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


-- 5. ATTACH TIMESTAMP TRIGGER TO PRODUCTS

DROP TRIGGER IF EXISTS trg_product_timestamp
ON products;

CREATE TRIGGER trg_product_timestamp
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_product_timestamp();
