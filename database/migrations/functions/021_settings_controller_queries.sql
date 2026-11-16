

CREATE OR REPLACE FUNCTION public.stockwise_settings_get_security_privacy_preferences(
    p_email text
)
RETURNS TABLE(login_alert_emails boolean, auto_sign_out_idle boolean)
LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM public.stockwise_settings_ensure(p_email);
    RETURN QUERY
    SELECT s.login_alert_emails, s.auto_sign_out_idle
    FROM public.user_settings AS s
    WHERE lower(s.email) = lower(p_email);
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_settings_update_security_privacy_preferences(
    p_email text, p_login_alert_emails boolean, p_auto_sign_out_idle boolean
)
RETURNS TABLE(login_alert_emails boolean, auto_sign_out_idle boolean)
LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM public.stockwise_settings_ensure(p_email);
    RETURN QUERY
    UPDATE public.user_settings AS s
    SET login_alert_emails = p_login_alert_emails,
        auto_sign_out_idle = p_auto_sign_out_idle,
        updated_at = CURRENT_TIMESTAMP
    WHERE lower(s.email) = lower(p_email)
    RETURNING s.login_alert_emails, s.auto_sign_out_idle;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_settings_get_inventory_defaults(
    p_email text
)
RETURNS TABLE(default_reorder_point integer)
LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM public.stockwise_settings_ensure(p_email);
    RETURN QUERY
    SELECT s.default_reorder_point
    FROM public.user_settings AS s
    WHERE lower(s.email) = lower(p_email);
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_settings_update_inventory_defaults(
    p_email text, p_default_reorder_point integer
)
RETURNS TABLE(default_reorder_point integer)
LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM public.stockwise_settings_ensure(p_email);
    RETURN QUERY
    UPDATE public.user_settings AS s
    SET default_reorder_point = p_default_reorder_point,
        updated_at = CURRENT_TIMESTAMP
    WHERE lower(s.email) = lower(p_email)
    RETURNING s.default_reorder_point;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_settings_get_security_status(
    p_email text
)
RETURNS TABLE(
    two_factor_enabled boolean,
    google_account_connected boolean
)
LANGUAGE sql
AS $function$
    SELECT COALESCE(
               (SELECT m.enabled
                FROM public.stockwise_auth_mfa_get(p_email) AS m),
               false
           ),
           COALESCE(
               (SELECT s.google_account_connected
                FROM public.user_settings AS s
                WHERE lower(s.email) = lower(p_email)),
               false
           );
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_settings_get_usage_analytics_consent(
    p_email text
)
RETURNS TABLE(enabled boolean)
LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM public.stockwise_settings_ensure(p_email);
    RETURN QUERY
    SELECT s.usage_analytics
    FROM public.user_settings AS s
    WHERE lower(s.email) = lower(p_email);
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_settings_update_usage_analytics_consent(
    p_email text, p_enabled boolean
)
RETURNS TABLE(usage_analytics boolean)
LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM public.stockwise_settings_ensure(p_email);
    RETURN QUERY
    UPDATE public.user_settings AS s
    SET usage_analytics = p_enabled,
        updated_at = CURRENT_TIMESTAMP
    WHERE lower(s.email) = lower(p_email)
    RETURNING s.usage_analytics;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_settings_get_account(p_email text)
RETURNS TABLE(
    email text,
    name text,
    "position" text,
    timezone text,
    invitation_notifications boolean,
    theme text,
    date_format text,
    currency text,
    density text,
    auto_sync_reports boolean,
    prioritize_low_stock boolean,
    avatar_data text
)
LANGUAGE sql
AS $function$
    SELECT settings.email, settings.name, settings."position",
           settings.timezone, settings.invitation_notifications,
           settings.theme, settings.date_format, settings.currency,
           settings.density, settings.auto_sync_reports,
           settings.prioritize_low_stock, user_settings.avatar_data
    FROM public.stockwise_settings_get(p_email) AS settings
    LEFT JOIN public.user_settings AS user_settings
      ON lower(user_settings.email) = lower(settings.email);
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_settings_update_avatar(
    p_email text, p_avatar_data text
)
RETURNS TABLE(avatar_data text)
LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM public.stockwise_settings_ensure(p_email);
    RETURN QUERY
    UPDATE public.user_settings AS s
    SET avatar_data = p_avatar_data,
        updated_at = CURRENT_TIMESTAMP
    WHERE lower(s.email) = lower(p_email)
    RETURNING s.avatar_data;
END;
$function$;