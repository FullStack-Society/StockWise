BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_mfa_authenticators (
    email varchar(320) PRIMARY KEY,
    secret_ciphertext text,
    pending_secret_ciphertext text,
    enabled boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.auth_mfa_recovery_codes (
    email varchar(320) NOT NULL,
    code_hash char(64) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (email, code_hash)
);

CREATE TABLE IF NOT EXISTS public.auth_mfa_challenges (
    token_hash char(64) PRIMARY KEY,
    email varchar(320) NOT NULL,
    expires_at timestamptz NOT NULL,
    failed_attempts smallint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_auth_mfa_challenges_expiration
    ON public.auth_mfa_challenges (expires_at);

CREATE OR REPLACE FUNCTION public.stockwise_auth_mfa_get(p_email text)
RETURNS TABLE(secret_ciphertext text, pending_secret_ciphertext text, enabled boolean)
LANGUAGE sql STABLE
AS $function$
    SELECT m.secret_ciphertext, m.pending_secret_ciphertext, m.enabled
    FROM public.auth_mfa_authenticators AS m
    WHERE lower(m.email) = lower(btrim(p_email));
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_auth_mfa_begin(
    p_email text, p_secret text
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO public.auth_mfa_authenticators (
        email, pending_secret_ciphertext, enabled, updated_at
    ) VALUES (lower(btrim(p_email)), p_secret, false, CURRENT_TIMESTAMP)
    ON CONFLICT (email) DO UPDATE
    SET pending_secret_ciphertext = EXCLUDED.pending_secret_ciphertext,
        updated_at = CURRENT_TIMESTAMP
    WHERE public.auth_mfa_authenticators.enabled = false;
    RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_auth_mfa_enable(
    p_email text, p_secret text, p_code_hashes text[]
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.auth_mfa_authenticators
    SET secret_ciphertext = p_secret,
        pending_secret_ciphertext = NULL,
        enabled = true,
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

CREATE OR REPLACE FUNCTION public.stockwise_auth_mfa_disable(p_email text)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM public.auth_mfa_authenticators
    WHERE lower(email) = lower(btrim(p_email));
    DELETE FROM public.auth_mfa_recovery_codes
    WHERE lower(email) = lower(btrim(p_email));
    DELETE FROM public.auth_mfa_challenges
    WHERE lower(email) = lower(btrim(p_email));
    RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_auth_mfa_challenge_create(
    p_email text, p_token_hash text
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM public.auth_mfa_challenges
    WHERE lower(email) = lower(btrim(p_email));
    INSERT INTO public.auth_mfa_challenges (token_hash, email, expires_at)
    VALUES (p_token_hash, lower(btrim(p_email)), CURRENT_TIMESTAMP + interval '5 minutes');
    RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_auth_mfa_challenge_get(p_token_hash text)
RETURNS TABLE(email text, failed_attempts smallint)
LANGUAGE sql STABLE
AS $function$
    SELECT c.email::text, c.failed_attempts
    FROM public.auth_mfa_challenges AS c
    WHERE c.token_hash = p_token_hash
      AND c.expires_at > CURRENT_TIMESTAMP
      AND c.failed_attempts < 5;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_auth_mfa_challenge_fail(p_token_hash text)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.auth_mfa_challenges
    SET failed_attempts = failed_attempts + 1,
        expires_at = CASE WHEN failed_attempts >= 4
            THEN CURRENT_TIMESTAMP ELSE expires_at END
    WHERE token_hash = p_token_hash;
    RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_auth_mfa_challenge_consume(p_token_hash text)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM public.auth_mfa_challenges WHERE token_hash = p_token_hash;
    RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_auth_mfa_recovery_consume(
    p_email text, p_code_hash text
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM public.auth_mfa_recovery_codes
    WHERE lower(email) = lower(btrim(p_email)) AND code_hash = p_code_hash;
    RETURN FOUND;
END;
$function$;

INSERT INTO public.schema_migrations (version, name)
VALUES ('016', 'Two-factor authentication')
ON CONFLICT (version) DO NOTHING;

COMMIT;
