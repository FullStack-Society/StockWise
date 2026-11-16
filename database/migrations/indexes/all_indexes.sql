-- Indexes for the current fresh-install table schema in tables/all_tables.sql.

CREATE UNIQUE INDEX uq_org_invitation_pending_email
    ON public.organization_invitations (organization_id, email)
    WHERE status = 'pending';
CREATE INDEX ix_org_invitations_email_pending
    ON public.organization_invitations (email, created_at DESC)
    WHERE status = 'pending';

CREATE INDEX ix_purchase_orders_org_created
    ON public.purchase_orders (organization_id, created_at DESC, order_id DESC);
CREATE INDEX ix_purchase_orders_org_active_created
    ON public.purchase_orders (organization_id, created_at DESC, order_id DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX ix_purchase_order_items_org_order
    ON public.purchase_order_items (organization_id, order_id);
CREATE INDEX ix_purchase_order_history_org_event
    ON public.purchase_order_history (organization_id, event_id DESC);

CREATE INDEX organization_leave_notifications_recipient_idx
    ON public.organization_leave_notifications
       (lower(recipient_email), created_at DESC);
CREATE INDEX ix_auth_password_reset_email
    ON public.auth_password_reset_tokens (lower(email), created_at DESC);
CREATE INDEX ix_auth_mfa_challenges_expiration
    ON public.auth_mfa_challenges (expires_at);
CREATE INDEX organization_member_login_notifications_recipient_idx
    ON public.organization_member_login_notifications
       (organization_id, lower(recipient_email), created_at DESC);
CREATE INDEX auth_rate_limit_buckets_window_started_at_idx
    ON public.auth_rate_limit_buckets (window_started_at);
CREATE INDEX ix_auth_registration_verifications_expiration
    ON public.auth_registration_verifications (expires_at);

CREATE UNIQUE INDEX products_organization_upc_unique_idx
    ON public.products (organization_id, upc)
    WHERE upc IS NOT NULL;
CREATE INDEX ix_sales_org_sold_at
    ON public.sales (organization_id, sold_at DESC);
