BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_registration_verifications (
    email varchar(320) PRIMARY KEY,
    full_name varchar(160) NOT NULL,
    password_hash text NOT NULL,
    code_hash char(64) NOT NULL,
    expires_at timestamptz NOT NULL,
    failed_attempts smallint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_auth_registration_verifications_expiration
    ON public.auth_registration_verifications (expires_at);

CREATE OR REPLACE FUNCTION public.stockwise_auth_registration_consume(
    p_email text,
    p_code_hash text
)
RETURNS TABLE(result text, full_name text, password_hash text)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_pending public.auth_registration_verifications%ROWTYPE;
BEGIN
    SELECT pending.* INTO v_pending
    FROM public.auth_registration_verifications AS pending
    WHERE pending.email = lower(btrim(p_email))
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'invalid'::text, NULL::text, NULL::text;
        RETURN;
    END IF;

    IF v_pending.expires_at <= CURRENT_TIMESTAMP
       OR v_pending.failed_attempts >= 8 THEN
        DELETE FROM public.auth_registration_verifications
        WHERE email = lower(btrim(p_email));
        RETURN QUERY SELECT 'invalid'::text, NULL::text, NULL::text;
        RETURN;
    END IF;

    IF v_pending.code_hash <> p_code_hash THEN
        UPDATE public.auth_registration_verifications
        SET failed_attempts = failed_attempts + 1
        WHERE email = lower(btrim(p_email));
        RETURN QUERY SELECT 'invalid'::text, NULL::text, NULL::text;
        RETURN;
    END IF;

    DELETE FROM public.auth_registration_verifications
    WHERE email = lower(btrim(p_email));
    RETURN QUERY SELECT 'verified'::text, v_pending.full_name::text,
                        v_pending.password_hash::text;
END;
$function$;

INSERT INTO public.schema_migrations (version, name)
VALUES ('026', 'Email verified manual registration')
ON CONFLICT (version) DO NOTHING;

COMMIT;
