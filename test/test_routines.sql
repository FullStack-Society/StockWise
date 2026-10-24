
-- ==============================================
-- STOCKWISE ROUTINE TESTS
-- ==============================================

-- 1. VIEW CATEGORIES
SELECT * FROM get_categories();

-- 2. VIEW ALL INVENTORY
SELECT * FROM get_inventory();

-- 3. SEARCH PRODUCTS
SELECT * FROM get_inventory('coffee', NULL, NULL);

-- 4. FILTER LOW STOCK
SELECT * FROM get_inventory(
    NULL,
    NULL,
    'Low stock'
);

-- 5. VIEW ONE PRODUCT
SELECT * FROM get_inventory_by_id(1);

-- 6. TEST STOCK STATUS
SELECT inventory_status(0, 5) AS status;
SELECT inventory_status(3, 5) AS status;
SELECT inventory_status(20, 5) AS status;

-- 7. CHECK VALID USER AND PRODUCT IDs
SELECT user_id, full_name FROM users;
SELECT product_id, product_name, quantity FROM products;
