

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
    UPDATE public.users AS u
    SET full_name = btrim(p_name)
    WHERE lower(u.email) = lower(btrim(p_email))
      AND u.is_active = true AND u.is_deleted = false;
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
    UPDATE public.users AS u
    SET full_name = btrim(p_name)
    WHERE lower(u.email) = lower(btrim(p_email))
      AND u.is_active = true AND u.is_deleted = false;
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