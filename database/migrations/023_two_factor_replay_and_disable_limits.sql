BEGIN;

ALTER TABLE public.auth_mfa_authenticators
    ADD COLUMN IF NOT EXISTS last_totp_step bigint NOT NULL DEFAULT -1,
    ADD COLUMN IF NOT EXISTS disable_failed_attempts smallint NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS disable_locked_until timestamptz;

DROP FUNCTION IF EXISTS public.stockwise_auth_mfa_enable(text, text, text[]);

CREATE OR REPLACE FUNCTION public.stockwise_auth_mfa_enable(
    p_email text, p_secret text, p_code_hashes text[], p_last_step bigint
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.auth_mfa_authenticators
    SET secret_ciphertext = p_secret,
        pending_secret_ciphertext = NULL,
        enabled = true,
        last_totp_step = p_last_step,
        disable_failed_attempts = 0,
        disable_locked_until = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE lower(email) = lower(btrim(p_email))
      AND pending_secret_ciphertext IS NOT NULL;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    DELETE FROM public.auth_mfa_recovery_codes
    WHERE lower(email) = lower(btrim(p_email));
    INSERT INTO public.auth_mfa_recovery_codes (email, code_hash)
    SELECT lower(btrim(p_email)), codes.code_hash
    FROM unnest(p_code_hashes) AS codes(code_hash);
    RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_auth_mfa_accept_totp(
    p_email text, p_step bigint
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.auth_mfa_authenticators
    SET last_totp_step = p_step, updated_at = CURRENT_TIMESTAMP
    WHERE lower(email) = lower(btrim(p_email))
      AND enabled = true
      AND last_totp_step < p_step;
    RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_auth_mfa_disable_allowed(p_email text)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
    v_allowed boolean;
BEGIN
    UPDATE public.auth_mfa_authenticators
    SET disable_failed_attempts = 0, disable_locked_until = NULL
    WHERE lower(email) = lower(btrim(p_email))
      AND disable_locked_until IS NOT NULL
      AND disable_locked_until <= CURRENT_TIMESTAMP;

    SELECT enabled AND disable_failed_attempts < 5
               AND (disable_locked_until IS NULL OR disable_locked_until <= CURRENT_TIMESTAMP)
    INTO v_allowed
    FROM public.auth_mfa_authenticators
    WHERE lower(email) = lower(btrim(p_email));
    RETURN COALESCE(v_allowed, false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_auth_mfa_disable_fail(p_email text)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.auth_mfa_authenticators
    SET disable_failed_attempts = LEAST(5, disable_failed_attempts + 1),
        disable_locked_until = CASE WHEN disable_failed_attempts >= 4
            THEN CURRENT_TIMESTAMP + interval '15 minutes'
            ELSE disable_locked_until END,
        updated_at = CURRENT_TIMESTAMP
    WHERE lower(email) = lower(btrim(p_email))
      AND enabled = true
      AND disable_failed_attempts < 5
      AND (disable_locked_until IS NULL OR disable_locked_until <= CURRENT_TIMESTAMP);
    RETURN FOUND;
END;
$function$;

INSERT INTO public.schema_migrations (version, name)
VALUES ('023', 'Authenticator replay protection and disable attempt limits')
ON CONFLICT (version) DO NOTHING;

COMMIT;
