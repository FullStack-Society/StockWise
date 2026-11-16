

CREATE OR REPLACE PROCEDURE public.stockwise_auth_rate_limit_cleanup()
LANGUAGE sql
AS $procedure$
    WITH expired AS (
        SELECT ctid
        FROM public.auth_rate_limit_buckets
        WHERE window_started_at < CURRENT_TIMESTAMP - interval '7 days'
        LIMIT 100
    )
    DELETE FROM public.auth_rate_limit_buckets AS buckets
    USING expired
    WHERE buckets.ctid = expired.ctid;
$procedure$;

CREATE OR REPLACE PROCEDURE public.stockwise_auth_mark_google_connected(
    p_email text
)
LANGUAGE sql
AS $procedure$
    UPDATE public.user_settings
    SET google_account_connected = true,
        updated_at = CURRENT_TIMESTAMP
    WHERE lower(email) = lower(p_email);
$procedure$;

CREATE OR REPLACE PROCEDURE public.stockwise_auth_registration_verification_store(
    p_email text,
    p_full_name text,
    p_password_hash text,
    p_code_hash text
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
    DELETE FROM public.auth_registration_verifications
    WHERE expires_at <= CURRENT_TIMESTAMP;

    INSERT INTO public.auth_registration_verifications
        (email, full_name, password_hash, code_hash, expires_at,
         failed_attempts, created_at)
    VALUES
        (p_email, p_full_name, p_password_hash, p_code_hash,
         CURRENT_TIMESTAMP + interval '10 minutes', 0, CURRENT_TIMESTAMP)
    ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        code_hash = EXCLUDED.code_hash,
        expires_at = EXCLUDED.expires_at,
        failed_attempts = 0,
        created_at = CURRENT_TIMESTAMP;
END;
$procedure$;