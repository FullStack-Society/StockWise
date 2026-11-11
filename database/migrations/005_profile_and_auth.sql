-- Folded from archive/012_fix_profile_name_update.sql
BEGIN;

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
    IF NOT EXISTS (
        SELECT 1
        FROM public.auth_users AS a
        WHERE lower(a.email) = lower(btrim(p_email))
          AND a.is_active = true AND a.is_deleted = false
        UNION ALL
        SELECT 1
        FROM public.users AS u
        WHERE lower(u.email) = lower(btrim(p_email))
          AND u.is_deleted = false
          AND NOT EXISTS (
              SELECT 1 FROM public.auth_users AS a
              WHERE lower(a.email) = lower(btrim(p_email))
                AND a.is_active = true AND a.is_deleted = false
          )
    ) THEN
        RETURN;
    END IF;

    UPDATE public.auth_users
    SET name = btrim(p_name)
    WHERE lower(email) = lower(btrim(p_email))
      AND is_active = true AND is_deleted = false;

    IF NOT EXISTS (
        SELECT 1
        FROM public.auth_users AS a
        WHERE lower(a.email) = lower(btrim(p_email))
          AND a.is_active = true AND a.is_deleted = false
    ) THEN
        UPDATE public.users
        SET full_name = btrim(p_name)
        WHERE lower(email) = lower(btrim(p_email)) AND is_deleted = false;
    END IF;

    PERFORM public.stockwise_settings_ensure(p_email);

    RETURN QUERY
    WITH account AS (
        SELECT a.email, a.name
        FROM public.auth_users AS a
        WHERE lower(a.email) = lower(btrim(p_email)) AND a.is_active = true
        UNION ALL
        SELECT u.email, u.full_name AS name
        FROM public.users AS u
        WHERE lower(u.email) = lower(btrim(p_email))
          AND u.is_deleted = false
          AND NOT EXISTS (
              SELECT 1 FROM public.auth_users AS a
              WHERE lower(a.email) = lower(btrim(p_email))
          )
        LIMIT 1
    ),
    updated AS (
        UPDATE public.user_settings AS s
        SET timezone = p_timezone, updated_at = CURRENT_TIMESTAMP
        FROM account AS a
        WHERE lower(s.email) = lower(a.email)
        RETURNING s.*
    )
    SELECT a.email::text, a.name::text, COALESCE(u.position, '')::text,
           u.timezone::text, u.invitation_notifications, u.theme::text,
           u.date_format::text, u.currency::text, u.density::text,
           u.auto_sync_reports, u.prioritize_low_stock
    FROM account AS a
    JOIN updated AS u ON lower(u.email) = lower(a.email);
END;
$function$;

COMMIT;

-- Folded from archive/013_fix_ambiguous_profile_email.sql
BEGIN;

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
    IF NOT EXISTS (
        SELECT 1
        FROM public.auth_users AS a
        WHERE lower(a.email) = lower(btrim(p_email))
          AND a.is_active = true AND a.is_deleted = false
        UNION ALL
        SELECT 1
        FROM public.users AS u
        WHERE lower(u.email) = lower(btrim(p_email))
          AND u.is_deleted = false
          AND NOT EXISTS (
              SELECT 1 FROM public.auth_users AS a
              WHERE lower(a.email) = lower(btrim(p_email))
                AND a.is_active = true AND a.is_deleted = false
          )
    ) THEN
        RETURN;
    END IF;

    UPDATE public.auth_users AS au
    SET name = btrim(p_name)
    WHERE lower(au.email) = lower(btrim(p_email))
      AND au.is_active = true AND au.is_deleted = false;

    IF NOT EXISTS (
        SELECT 1
        FROM public.auth_users AS a
        WHERE lower(a.email) = lower(btrim(p_email))
          AND a.is_active = true AND a.is_deleted = false
    ) THEN
        UPDATE public.users AS u
        SET full_name = btrim(p_name)
        WHERE lower(u.email) = lower(btrim(p_email))
          AND u.is_deleted = false;
    END IF;

    PERFORM public.stockwise_settings_ensure(p_email);

    RETURN QUERY
    WITH account AS (
        SELECT a.email, a.name
        FROM public.auth_users AS a
        WHERE lower(a.email) = lower(btrim(p_email)) AND a.is_active = true
        UNION ALL
        SELECT u.email, u.full_name AS name
        FROM public.users AS u
        WHERE lower(u.email) = lower(btrim(p_email))
          AND u.is_deleted = false
          AND NOT EXISTS (
              SELECT 1 FROM public.auth_users AS a
              WHERE lower(a.email) = lower(btrim(p_email))
          )
        LIMIT 1
    ),
    updated AS (
        UPDATE public.user_settings AS s
        SET timezone = p_timezone, updated_at = CURRENT_TIMESTAMP
        FROM account AS a
        WHERE lower(s.email) = lower(a.email)
        RETURNING s.*
    )
    SELECT a.email::text, a.name::text, COALESCE(u.position, '')::text,
           u.timezone::text, u.invitation_notifications, u.theme::text,
           u.date_format::text, u.currency::text, u.density::text,
           u.auto_sync_reports, u.prioritize_low_stock
    FROM account AS a
    JOIN updated AS u ON lower(u.email) = lower(a.email);
END;
$function$;

COMMIT;

-- Folded from archive/015_fix_auth_user_registration.sql
BEGIN;

ALTER TABLE public.auth_users
    ALTER COLUMN is_active SET DEFAULT true;

CREATE OR REPLACE FUNCTION public.stockwise_auth_create_account(
    p_name text, p_email text, p_password_hash text
)
RETURNS TABLE(id integer, name text, email text, role text)
LANGUAGE sql
AS $function$
    INSERT INTO public.auth_users (
        name, email, password_hash, role, is_active, is_deleted
    )
    VALUES (
        btrim(p_name), lower(btrim(p_email)), p_password_hash,
        'staff', true, false
    )
    RETURNING auth_users.id, auth_users.name::text,
              auth_users.email::text, auth_users.role::text;
$function$;

COMMIT;

INSERT INTO public.schema_migrations (version, name)
VALUES ('005', 'Profile updates, account registration, and profile fixes')
ON CONFLICT (version) DO NOTHING;
