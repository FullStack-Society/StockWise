

CREATE OR REPLACE FUNCTION public.stockwise_transaction_timestamp(
    p_transaction public.inventory_transactions
)
RETURNS timestamptz
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $function$
    SELECT COALESCE(
        (to_jsonb(p_transaction) ->> 'transaction_date')::timestamptz,
        (to_jsonb(p_transaction) ->> 'created_at')::timestamptz,
        (to_jsonb(p_transaction) ->> 'transaction_at')::timestamptz,
        (to_jsonb(p_transaction) ->> 'timestamp')::timestamptz,
        (to_jsonb(p_transaction) ->> 'date')::timestamptz
    );
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_auth_owner_exists()
RETURNS boolean
LANGUAGE sql
STABLE
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE role = 'owner' AND is_active = true AND is_deleted = false
    );
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_auth_get_user(p_email text)
RETURNS TABLE(
    id integer, name text, email text, password_hash text,
    role text, is_active boolean, is_deleted boolean
)
LANGUAGE sql
STABLE
AS $function$
    SELECT u.user_id, u.full_name::text, u.email::text, u.password_hash::text,
           u.role::text, u.is_active, u.is_deleted
    FROM public.users AS u
    WHERE lower(u.email) = lower(btrim(p_email))
    ORDER BY u.user_id
    LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_auth_create_owner(
    p_name text, p_email text, p_password_hash text
)
RETURNS TABLE(id integer, name text, email text, role text)
LANGUAGE sql
AS $function$
    INSERT INTO public.users (
        full_name, email, password_hash, role, is_active, is_deleted
    )
    VALUES (
        btrim(p_name), lower(btrim(p_email)), p_password_hash,
        'owner', true, false
    )
    RETURNING user_id, full_name::text, users.email::text, users.role::text;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_auth_create_account(
    p_name text, p_email text, p_password_hash text
)
RETURNS TABLE(id integer, name text, email text, role text)
LANGUAGE sql
AS $function$
    INSERT INTO public.users (
        full_name, email, password_hash, role, is_active, is_deleted
    )
    VALUES (
        btrim(p_name), lower(btrim(p_email)), p_password_hash,
        'staff', true, false
    )
    RETURNING user_id, full_name::text, users.email::text, users.role::text;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_settings_ensure(p_email text)
RETURNS void
LANGUAGE sql
AS $function$
    INSERT INTO public.user_settings (email)
    SELECT lower(u.email)
    FROM public.users AS u
    WHERE lower(u.email) = lower(btrim(p_email))
      AND u.is_active = true AND u.is_deleted = false
    ON CONFLICT (email) DO NOTHING;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_settings_get(p_email text)
RETURNS TABLE(
    email text, name text, "position" text, timezone text,
    invitation_notifications boolean, theme text, date_format text,
    currency text, density text, auto_sync_reports boolean,
    prioritize_low_stock boolean
)
LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM public.stockwise_settings_ensure(p_email);
    RETURN QUERY
    SELECT u.email::text, u.full_name::text,
           COALESCE(s.position, '')::text, s.timezone::text,
           s.invitation_notifications, s.theme::text, s.date_format::text,
           s.currency::text, s.density::text, s.auto_sync_reports,
           s.prioritize_low_stock
    FROM public.users AS u
    LEFT JOIN public.user_settings AS s ON lower(s.email) = lower(u.email)
    WHERE lower(u.email) = lower(btrim(p_email))
      AND u.is_active = true AND u.is_deleted = false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_settings_update_profile(
    p_email text, p_name text, p_timezone text
)
RETURNS TABLE(
    email text, name text, "position" text, timezone text,
    invitation_notifications boolean, theme text, date_format text,
    currency text, density text, auto_sync_reports boolean,
    prioritize_low_stock boolean
)
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.users
    SET full_name = btrim(p_name)
    WHERE lower(email) = lower(btrim(p_email))
      AND is_active = true AND is_deleted = false;
    IF NOT FOUND THEN RETURN; END IF;

    PERFORM public.stockwise_settings_ensure(p_email);
    RETURN QUERY
    WITH updated AS (
        UPDATE public.user_settings AS s
        SET timezone = p_timezone, updated_at = CURRENT_TIMESTAMP
        WHERE lower(s.email) = lower(btrim(p_email))
        RETURNING s.*
    )
    SELECT u.email::text, u.full_name::text, COALESCE(s.position, '')::text,
           s.timezone::text, s.invitation_notifications, s.theme::text,
           s.date_format::text, s.currency::text, s.density::text,
           s.auto_sync_reports, s.prioritize_low_stock
    FROM public.users AS u
    JOIN updated AS s ON lower(s.email) = lower(u.email)
    WHERE lower(u.email) = lower(btrim(p_email));
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_settings_update_preferences(
    p_email text,
    p_invitation_notifications boolean,
    p_theme text,
    p_date_format text,
    p_currency text,
    p_density text,
    p_auto_sync_reports boolean,
    p_prioritize_low_stock boolean
)
RETURNS TABLE(
    email text, name text, "position" text, timezone text,
    invitation_notifications boolean, theme text, date_format text,
    currency text, density text, auto_sync_reports boolean,
    prioritize_low_stock boolean
)
LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM public.stockwise_settings_ensure(p_email);
    RETURN QUERY
    WITH updated AS (
        UPDATE public.user_settings AS s
        SET invitation_notifications = p_invitation_notifications,
            theme = p_theme, date_format = p_date_format,
            currency = p_currency, density = p_density,
            auto_sync_reports = p_auto_sync_reports,
            prioritize_low_stock = p_prioritize_low_stock,
            updated_at = CURRENT_TIMESTAMP
        WHERE lower(s.email) = lower(btrim(p_email))
        RETURNING s.*
    )
    SELECT u.email::text, u.full_name::text, COALESCE(s.position, '')::text,
           s.timezone::text, s.invitation_notifications, s.theme::text,
           s.date_format::text, s.currency::text, s.density::text,
           s.auto_sync_reports, s.prioritize_low_stock
    FROM public.users AS u
    JOIN updated AS s ON lower(s.email) = lower(u.email)
    WHERE lower(u.email) = lower(btrim(p_email))
      AND u.is_active = true AND u.is_deleted = false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_settings_get_password_account(
    p_email text
)
RETURNS TABLE(password_hash text, account_table text)
LANGUAGE sql
STABLE
AS $function$
    SELECT u.password_hash::text, 'users'::text
    FROM public.users AS u
    WHERE lower(u.email) = lower(btrim(p_email))
      AND u.is_active = true AND u.is_deleted = false
    LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_settings_update_password(
    p_email text, p_account_table text, p_password_hash text
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    IF p_account_table <> 'users' THEN RETURN false; END IF;
    UPDATE public.users
    SET password_hash = p_password_hash
    WHERE lower(email) = lower(btrim(p_email))
      AND is_active = true AND is_deleted = false;
    RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_settings_delete_account(
    p_email text
)
RETURNS TABLE(owner_membership boolean, account_found boolean)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_count integer;
BEGIN
    owner_membership := EXISTS (
        SELECT 1
        FROM public.organization_memberships AS m
        WHERE lower(m.email) = lower(btrim(p_email))
          AND m.status = 'active'
          AND (m.role = 'owner' OR EXISTS (
              SELECT 1 FROM public.users AS u
              WHERE lower(u.email) = lower(btrim(p_email))
                AND lower(u.role) = 'owner'
          ))
    );
    IF owner_membership THEN
        account_found := true;
        RETURN NEXT;
        RETURN;
    END IF;

    UPDATE public.users
    SET is_active = false, is_deleted = true,
        deleted_at = CURRENT_TIMESTAMP
    WHERE lower(email) = lower(btrim(p_email)) AND is_deleted = false;
    GET DIAGNOSTICS v_user_count = ROW_COUNT;

    account_found := v_user_count > 0;
    IF account_found THEN
        UPDATE public.organization_memberships
        SET status = 'account_deleted'
        WHERE lower(email) = lower(btrim(p_email)) AND status = 'active';
        UPDATE public.organization_invitations
        SET status = 'revoked', responded_at = CURRENT_TIMESTAMP
        WHERE lower(email) = lower(btrim(p_email)) AND status = 'pending';
    END IF;

    owner_membership := false;
    RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_ensure_default_categories(
    p_organization_id integer
)
RETURNS void
LANGUAGE sql
AS $function$
    INSERT INTO public.categories
        (category_name, description, organization_id)
    VALUES
        ('Electronics', 'Electronic devices', p_organization_id),
        ('Accessories', 'Computer accessories', p_organization_id),
        ('Office Supplies', 'Office equipment', p_organization_id),
        ('Networking', 'Routers and networking equipment', p_organization_id),
        ('Storage', 'Storage devices', p_organization_id)
    ON CONFLICT (organization_id, category_name) DO NOTHING;
$function$;

CREATE OR REPLACE FUNCTION public.org_rename_organization(
    p_organization_id integer, p_actor_email text, p_organization_name text
)
RETURNS TABLE(organization_id integer, organization_name text, role text)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_actor_role text;
BEGIN
    SELECT m.role INTO v_actor_role
    FROM public.organization_memberships AS m
    WHERE m.organization_id = p_organization_id
      AND lower(m.email) = lower(btrim(p_actor_email))
      AND m.status = 'active';

    IF v_actor_role IS DISTINCT FROM 'owner' THEN
        RAISE EXCEPTION 'Only the organization owner can rename it'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    UPDATE public.organizations AS o
    SET organization_name = btrim(p_organization_name)
    WHERE o.organization_id = p_organization_id
    RETURNING o.organization_id, o.organization_name::text, v_actor_role::text;
END;
$function$;
