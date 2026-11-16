

CREATE OR REPLACE FUNCTION public.stockwise_auth_rate_limit_record(
    p_scope text,
    p_subject_hash text,
    p_limit integer,
    p_window_seconds integer
)
RETURNS TABLE(attempts integer, window_started_at timestamptz)
LANGUAGE sql
AS $function$
    INSERT INTO public.auth_rate_limit_buckets
        (scope, subject_hash, window_started_at, attempts)
    VALUES (p_scope, p_subject_hash, CURRENT_TIMESTAMP, 1)
    ON CONFLICT (scope, subject_hash) DO UPDATE
    SET attempts = CASE
            WHEN auth_rate_limit_buckets.window_started_at
                 <= CURRENT_TIMESTAMP - (p_window_seconds * interval '1 second')
            THEN 1
            ELSE LEAST(p_limit + 1, auth_rate_limit_buckets.attempts + 1)
        END,
        window_started_at = CASE
            WHEN auth_rate_limit_buckets.window_started_at
                 <= CURRENT_TIMESTAMP - (p_window_seconds * interval '1 second')
            THEN CURRENT_TIMESTAMP
            ELSE auth_rate_limit_buckets.window_started_at
        END
    RETURNING auth_rate_limit_buckets.attempts,
              auth_rate_limit_buckets.window_started_at;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_auth_login_alerts_enabled(
    p_email text
)
RETURNS TABLE(login_alert_emails boolean)
LANGUAGE sql
STABLE
AS $function$
    SELECT login_alert_emails
    FROM public.user_settings
    WHERE lower(email) = lower(p_email);
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_auth_login_device_record(
    p_email text,
    p_device_hash text
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO public.auth_login_devices (email, device_hash)
    VALUES (p_email, p_device_hash)
    ON CONFLICT (email, device_hash) DO NOTHING;

    IF FOUND THEN
        RETURN true;
    END IF;

    UPDATE public.auth_login_devices
    SET last_seen_at = CURRENT_TIMESTAMP
    WHERE email = p_email AND device_hash = p_device_hash;
    RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_auth_registration_verification_resend(
    p_email text,
    p_code_hash text
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.auth_registration_verifications
    SET code_hash = p_code_hash,
        expires_at = CURRENT_TIMESTAMP + interval '10 minutes',
        failed_attempts = 0,
        created_at = CURRENT_TIMESTAMP
    WHERE email = p_email
      AND created_at > CURRENT_TIMESTAMP - interval '24 hours';
    RETURN FOUND;
END;
$function$;