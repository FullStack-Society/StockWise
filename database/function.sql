
-- ==============================================
-- STOCKWISE DATABASE FUNCTIONS
-- PostgreSQL 18
-- ==============================================

-- 1. INVENTORY STATUS
CREATE OR REPLACE FUNCTION inventory_status(
    p_quantity INTEGER,
    p_minimum_stock INTEGER
)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT CASE
        WHEN p_quantity = 0 THEN 'Out of stock'
        WHEN p_quantity <= p_minimum_stock THEN 'Low stock'
        ELSE 'In stock'
    END;
$$;


-- 2. GET CATEGORIES
CREATE OR REPLACE FUNCTION get_categories()
RETURNS TABLE (
    category_id INTEGER,
    category_name TEXT,
    description TEXT
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        c.category_id,
        c.category_name::TEXT,
        c.description::TEXT
    FROM categories AS c
    ORDER BY c.category_name;
$$;


-- 3. GET INVENTORY
-- Optional search, category and stock-status filters
CREATE OR REPLACE FUNCTION get_inventory(
    p_search TEXT DEFAULT NULL,
    p_category_id INTEGER DEFAULT NULL,
    p_stock_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    product_id INTEGER,
    product_name TEXT,
    sku TEXT,
    category_id INTEGER,
    description TEXT,
    price NUMERIC,
    quantity INTEGER,
    minimum_stock INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    category_name TEXT,
    status TEXT
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        p.product_id,
        p.product_name::TEXT,
        p.sku::TEXT,
        p.category_id,
        p.description::TEXT,
        p.price,
        p.quantity,
        p.minimum_stock,
        p.created_at,
        p.updated_at,
        c.category_name::TEXT,
        inventory_status(
            p.quantity,
            p.minimum_stock
        ) AS status
    FROM products AS p
    LEFT JOIN categories AS c
        ON c.category_id = p.category_id
    WHERE
        (
            NULLIF(BTRIM(p_search), '') IS NULL
            OR p.product_name ILIKE
                '%' || BTRIM(p_search) || '%'
            OR p.sku ILIKE
                '%' || BTRIM(p_search) || '%'
        )
        AND (
            p_category_id IS NULL
            OR p.category_id = p_category_id
        )
        AND (
            NULLIF(BTRIM(p_stock_status), '') IS NULL
            OR inventory_status(
                p.quantity,
                p.minimum_stock
            ) = BTRIM(p_stock_status)
        )
    ORDER BY p.product_id DESC;
$$;


-- 4. GET INVENTORY BY ID
CREATE OR REPLACE FUNCTION get_inventory_by_id(
    p_product_id INTEGER
)
RETURNS TABLE (
    product_id INTEGER,
    product_name TEXT,
    sku TEXT,
    category_id INTEGER,
    description TEXT,
    price NUMERIC,
    quantity INTEGER,
    minimum_stock INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    category_name TEXT,
    status TEXT
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        p.product_id,
        p.product_name::TEXT,
        p.sku::TEXT,
        p.category_id,
        p.description::TEXT,
        p.price,
        p.quantity,
        p.minimum_stock,
        p.created_at,
        p.updated_at,
        c.category_name::TEXT,
        inventory_status(
            p.quantity,
            p.minimum_stock
        )
    FROM products AS p
    LEFT JOIN categories AS c
        ON c.category_id = p.category_id
    WHERE p.product_id = p_product_id;
$$;


-- 5. CREATE INVENTORY
CREATE OR REPLACE FUNCTION create_inventory(
    p_product_name TEXT,
    p_sku TEXT,
    p_category_id INTEGER,
    p_description TEXT,
    p_price NUMERIC,
    p_quantity INTEGER,
    p_minimum_stock INTEGER
)
RETURNS TABLE (
    product_id INTEGER,
    product_name TEXT,
    sku TEXT,
    category_id INTEGER,
    description TEXT,
    price NUMERIC,
    quantity INTEGER,
    minimum_stock INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    category_name TEXT,
    status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_product_id INTEGER;
BEGIN
    IF NULLIF(BTRIM(p_product_name), '') IS NULL THEN
        RAISE EXCEPTION 'Product name is required'
            USING ERRCODE = '22023';
    END IF;

    IF NULLIF(BTRIM(p_sku), '') IS NULL THEN
        RAISE EXCEPTION 'SKU is required'
            USING ERRCODE = '22023';
    END IF;

    IF p_price IS NULL
       OR p_quantity IS NULL
       OR p_minimum_stock IS NULL
       OR p_price < 0
       OR p_quantity < 0
       OR p_minimum_stock < 0 THEN
        RAISE EXCEPTION
            'Price, quantity, and minimum stock must be non-negative'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO products (
        product_name,
        sku,
        category_id,
        description,
        price,
        quantity,
        minimum_stock
    )
    VALUES (
        BTRIM(p_product_name),
        BTRIM(p_sku),
        p_category_id,
        p_description,
        p_price,
        p_quantity,
        p_minimum_stock
    )
    RETURNING products.product_id
    INTO v_product_id;

    RETURN QUERY
    SELECT *
    FROM get_inventory_by_id(v_product_id);
END;
$$;


-- 6. UPDATE INVENTORY
-- Full PUT update: all fields are provided
CREATE OR REPLACE FUNCTION update_inventory(
    p_product_id INTEGER,
    p_product_name TEXT,
    p_sku TEXT,
    p_category_id INTEGER,
    p_description TEXT,
    p_price NUMERIC,
    p_quantity INTEGER,
    p_minimum_stock INTEGER
)
RETURNS TABLE (
    product_id INTEGER,
    product_name TEXT,
    sku TEXT,
    category_id INTEGER,
    description TEXT,
    price NUMERIC,
    quantity INTEGER,
    minimum_stock INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    category_name TEXT,
    status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF NULLIF(BTRIM(p_product_name), '') IS NULL THEN
        RAISE EXCEPTION 'Product name is required'
            USING ERRCODE = '22023';
    END IF;

    IF NULLIF(BTRIM(p_sku), '') IS NULL THEN
        RAISE EXCEPTION 'SKU is required'
            USING ERRCODE = '22023';
    END IF;

    IF p_price IS NULL
       OR p_quantity IS NULL
       OR p_minimum_stock IS NULL
       OR p_price < 0
       OR p_quantity < 0
       OR p_minimum_stock < 0 THEN
        RAISE EXCEPTION
            'Price, quantity, and minimum stock must be non-negative'
            USING ERRCODE = '22023';
    END IF;

    UPDATE products AS p
    SET
        product_name = BTRIM(p_product_name),
        sku = BTRIM(p_sku),
        category_id = p_category_id,
        description = p_description,
        price = p_price,
        quantity = p_quantity,
        minimum_stock = p_minimum_stock,
        updated_at = CURRENT_TIMESTAMP
    WHERE p.product_id = p_product_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT *
    FROM get_inventory_by_id(p_product_id);
END;
$$;


-- 7. DELETE INVENTORY
-- Preserve products that have transaction history
CREATE OR REPLACE FUNCTION delete_inventory(
    p_product_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM products AS p
        WHERE p.product_id = p_product_id
    ) THEN
        RETURN FALSE;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM inventory_transactions AS t
        WHERE t.product_id = p_product_id
    ) THEN
        RETURN FALSE;
    END IF;

    DELETE FROM products AS p
    WHERE p.product_id = p_product_id;

    RETURN FOUND;
EXCEPTION
    WHEN foreign_key_violation THEN
        RETURN FALSE;
END;
$$;
