

CREATE OR REPLACE FUNCTION public.stockwise_auth_store_password_reset(
    p_email text, p_account_table text, p_token_hash text
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    IF p_account_table <> 'users' THEN
        RETURN false;
    END IF;

    DELETE FROM public.auth_password_reset_tokens
    WHERE lower(email) = lower(btrim(p_email)) AND used_at IS NULL;

    INSERT INTO public.auth_password_reset_tokens (
        token_hash, email, account_table, expires_at
    ) VALUES (
        p_token_hash, lower(btrim(p_email)), p_account_table,
        CURRENT_TIMESTAMP + interval '30 minutes'
    );
    RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stockwise_auth_consume_password_reset(
    p_token_hash text, p_password_hash text
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
    v_email text;
    v_account_table text;
    v_updated integer;
BEGIN
    SELECT email, account_table
    INTO v_email, v_account_table
    FROM public.auth_password_reset_tokens
    WHERE token_hash = p_token_hash
      AND used_at IS NULL
      AND expires_at > CURRENT_TIMESTAMP
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    UPDATE public.users
    SET password_hash = p_password_hash
    WHERE lower(email) = lower(v_email)
      AND is_active = true AND is_deleted = false;
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated = 0 THEN
        RETURN false;
    END IF;

    UPDATE public.auth_password_reset_tokens
    SET used_at = CURRENT_TIMESTAMP
    WHERE token_hash = p_token_hash;
    RETURN true;
END;
$function$;