SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';


SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;


BEGIN;

-- =====================================
-- 1. SAMPLE USERS
-- =====================================

INSERT INTO users
(full_name, username, email, password_hash, role)
VALUES
('James Mendoza', 'jamesm', 'james@example.com', 'TEST_ONLY_001', 'admin'),
('Sophia Reyes', 'sophiar', 'sophia@example.com', 'TEST_ONLY_002', 'admin'),
('Mark Santos', 'marks', 'mark@example.com', 'TEST_ONLY_003', 'staff'),
('Angela Cruz', 'angelac', 'angela@example.com', 'TEST_ONLY_004', 'staff'),
('Daniel Garcia', 'danielg', 'daniel@example.com', 'TEST_ONLY_005', 'staff')
ON CONFLICT DO NOTHING;


-- =====================================
-- 2. SAMPLE CATEGORIES
-- =====================================

INSERT INTO categories
(category_name, description)
VALUES
('Electronics', 'Electronic devices'),
('Accessories', 'Computer accessories'),
('Office Supplies', 'Office equipment'),
('Networking', 'Routers and networking equipment'),
('Storage', 'Storage devices')
ON CONFLICT DO NOTHING;


-- =====================================
-- 3. SAMPLE PRODUCTS
-- =====================================

INSERT INTO products
(product_name, sku, category_id, description,
 price, quantity, minimum_stock)
VALUES
('Mechanical Keyboard', 'KB100',
 (SELECT category_id FROM categories WHERE category_name = 'Accessories'),
 'Mechanical USB keyboard', 2500, 30, 5),

('Wireless Mouse', 'MS100',
 (SELECT category_id FROM categories WHERE category_name = 'Accessories'),
 'Wireless optical mouse', 850, 45, 10),

('Gaming Headset', 'HS100',
 (SELECT category_id FROM categories WHERE category_name = 'Accessories'),
 'USB gaming headset', 1800, 20, 5),

('24-inch Monitor', 'MN100',
 (SELECT category_id FROM categories WHERE category_name = 'Electronics'),
 'Full HD monitor', 6500, 15, 3),

('Laptop', 'LP100',
 (SELECT category_id FROM categories WHERE category_name = 'Electronics'),
 'Business laptop', 35000, 10, 2),

('Desktop Computer', 'PC100',
 (SELECT category_id FROM categories WHERE category_name = 'Electronics'),
 'Office desktop PC', 28000, 8, 2),

('Printer', 'PR100',
 (SELECT category_id FROM categories WHERE category_name = 'Office Supplies'),
 'Inkjet printer', 5500, 12, 3),

('Bond Paper', 'BP100',
 (SELECT category_id FROM categories WHERE category_name = 'Office Supplies'),
 'A4 paper ream', 250, 100, 20),

('Ballpen Box', 'PN100',
 (SELECT category_id FROM categories WHERE category_name = 'Office Supplies'),
 'Box of 12 pens', 120, 60, 10),

('WiFi Router', 'RT100',
 (SELECT category_id FROM categories WHERE category_name = 'Networking'),
 'Dual-band router', 3200, 18, 5),

('Network Switch', 'SW100',
 (SELECT category_id FROM categories WHERE category_name = 'Networking'),
 '8-port gigabit switch', 1900, 15, 3),

('Ethernet Cable', 'ET100',
 (SELECT category_id FROM categories WHERE category_name = 'Networking'),
 'CAT6 5-meter cable', 180, 75, 15),

('1TB SSD', 'SD100',
 (SELECT category_id FROM categories WHERE category_name = 'Storage'),
 '1TB solid state drive', 4200, 25, 5),

('2TB HDD', 'HD100',
 (SELECT category_id FROM categories WHERE category_name = 'Storage'),
 '2TB hard disk drive', 3500, 20, 5),

('64GB Flash Drive', 'FD100',
 (SELECT category_id FROM categories WHERE category_name = 'Storage'),
 'USB 3.0 flash drive', 450, 50, 10)
ON CONFLICT DO NOTHING;


-- =====================================
-- 4. SAMPLE INVENTORY TRANSACTIONS
-- Historical test records.
-- These do not modify current stock.
-- =====================================

WITH sample_transactions
(sku, username, transaction_type, qty, remarks) AS (
    VALUES
    ('KB100','jamesm','STOCK_IN',10,'New keyboard delivery'),
    ('MS100','marks','STOCK_OUT',3,'Customer purchase'),
    ('HS100','angelac','STOCK_IN',5,'Supplier delivery'),
    ('MN100','danielg','STOCK_OUT',2,'Monitor sale'),
    ('LP100','jamesm','STOCK_IN',4,'New laptops'),
    ('PC100','sophiar','STOCK_OUT',1,'Office computer sale'),
    ('PR100','marks','STOCK_IN',5,'Printer restock'),
    ('BP100','angelac','STOCK_OUT',10,'Office consumption'),
    ('PN100','danielg','STOCK_OUT',5,'Office supplies sale'),
    ('RT100','jamesm','STOCK_IN',6,'Router delivery'),
    ('SW100','sophiar','STOCK_OUT',2,'Network installation'),
    ('ET100','marks','STOCK_OUT',8,'Cable purchase'),
    ('SD100','angelac','STOCK_IN',10,'SSD restock'),
    ('HD100','danielg','STOCK_OUT',3,'HDD purchase'),
    ('FD100','jamesm','STOCK_IN',15,'Flash drive delivery'),
    ('KB100','marks','STOCK_OUT',2,'Keyboard purchase'),
    ('MS100','angelac','STOCK_IN',10,'Mouse restock'),
    ('MN100','sophiar','STOCK_IN',5,'Monitor delivery'),
    ('RT100','danielg','STOCK_OUT',2,'Router sale'),
    ('SD100','marks','STOCK_OUT',4,'SSD purchase')
)
INSERT INTO inventory_transactions
(product_id, user_id, transaction_type, quantity, remarks)
SELECT
    p.product_id,
    u.user_id,
    s.transaction_type,
    s.qty,
    'TEST DATA - ' || s.remarks
FROM sample_transactions s
JOIN products p ON p.sku = s.sku
JOIN users u ON u.username = s.username;

COMMIT;



-- Check all users
SELECT * FROM users;

-- Check products and stock
SELECT * FROM products;

-- Check inventory transactions
SELECT * FROM inventory_transactions;



SELECT
    p.product_name,
    p.sku,
    c.category_name,
    p.price,
    p.quantity,
    p.price * p.quantity AS inventory_value,
    CASE
        WHEN p.quantity = 0 THEN 'OUT OF STOCK'
        WHEN p.quantity <= p.minimum_stock THEN 'LOW STOCK'
        ELSE 'IN STOCK'
    END AS stock_status
FROM products p
LEFT JOIN categories c
    ON p.category_id = c.category_id
ORDER BY p.product_name;


SELECT
    t.transaction_id,
    p.product_name,
    u.full_name AS performed_by,
    t.transaction_type,
    t.quantity,
    t.remarks,
    t.transaction_date
FROM inventory_transactions t
JOIN products p
    ON t.product_id = p.product_id
JOIN users u
    ON t.user_id = u.user_id
ORDER BY t.transaction_date DESC;


