
-- ==============================================
-- TRANSACTION TYPE CONSTRAINT MIGRATION
-- ==============================================

BEGIN;

ALTER TABLE public.inventory_transactions
DROP CONSTRAINT IF EXISTS check_transaction_type;

ALTER TABLE public.inventory_transactions
ADD CONSTRAINT check_transaction_type
CHECK (
    transaction_type IN (
        'IN',
        'OUT',
        'STOCK_IN',
        'STOCK_OUT',
        'ADJUSTMENT_IN',
        'ADJUSTMENT_OUT'
    )
);

COMMIT;
