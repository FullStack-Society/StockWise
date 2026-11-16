-- 001_core.sql


CREATE UNIQUE INDEX uq_org_invitation_pending_email
    ON public.organization_invitations (organization_id, email)
    WHERE status = 'pending';
CREATE INDEX ix_org_invitations_email_pending
    ON public.organization_invitations (email, created_at DESC)
    WHERE status = 'pending';
-- 003_inventory_workflows.sql


CREATE INDEX IF NOT EXISTS ix_inventory_location_stock_product
    ON public.inventory_location_stock (organization_id, product_id);
CREATE INDEX IF NOT EXISTS ix_inventory_stocktakes_location_created
    ON public.inventory_stocktakes (organization_id, location_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_inventory_location_transfers_source_created
    ON public.inventory_location_transfers
       (organization_id, source_location_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_inventory_location_transfers_destination_created
    ON public.inventory_location_transfers
       (organization_id, destination_location_id, created_at DESC);
-- 004_purchase_orders.sql


CREATE INDEX ix_purchase_orders_org_created
    ON public.purchase_orders (organization_id, created_at DESC, order_id DESC);
CREATE INDEX ix_purchase_order_items_org_order
    ON public.purchase_order_items (organization_id, order_id);
-- 006_leave_notifications.sql


CREATE INDEX IF NOT EXISTS organization_leave_notifications_recipient_idx
    ON public.organization_leave_notifications
       (lower(recipient_email), created_at DESC);
-- 009_purchase_order_numbering_and_history.sql


CREATE INDEX ix_purchase_orders_org_active_created
    ON public.purchase_orders (organization_id, created_at DESC, order_id DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_purchase_order_history_org_event
    ON public.purchase_order_history (organization_id, event_id DESC);
-- 013_remove_barcode.sql


DROP INDEX IF EXISTS public.uq_products_org_barcode;
-- 015_google_auth_and_password_reset.sql


CREATE INDEX IF NOT EXISTS ix_auth_password_reset_email
    ON public.auth_password_reset_tokens (lower(email), created_at DESC);
-- 016_two_factor_authentication.sql


CREATE INDEX IF NOT EXISTS ix_auth_mfa_challenges_expiration
    ON public.auth_mfa_challenges (expires_at);
-- 019_member_presence_login_notifications.sql


CREATE INDEX IF NOT EXISTS organization_member_login_notifications_recipient_idx
    ON public.organization_member_login_notifications
       (organization_id, lower(recipient_email), created_at DESC);
-- 024_auth_rate_limits.sql


CREATE INDEX IF NOT EXISTS auth_rate_limit_buckets_window_started_at_idx
    ON public.auth_rate_limit_buckets (window_started_at);
-- 025_remove_inventory_locations.sql

DROP INDEX IF EXISTS public.ix_inventory_stocktakes_location_created;
-- 026_email_verified_manual_registration.sql


CREATE INDEX IF NOT EXISTS ix_auth_registration_verifications_expiration
    ON public.auth_registration_verifications (expires_at);
-- 030_add_product_upc.sql


CREATE UNIQUE INDEX IF NOT EXISTS products_organization_upc_unique_idx
    ON public.products (organization_id, upc)
    WHERE upc IS NOT NULL;
-- 031_sales_revenue_ledger.sql


CREATE INDEX ix_sales_org_sold_at
    ON public.sales (organization_id, sold_at DESC);
