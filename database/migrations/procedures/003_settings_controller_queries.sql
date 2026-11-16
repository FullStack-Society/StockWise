

CREATE OR REPLACE PROCEDURE public.stockwise_settings_clear_login_devices(
    p_email text
)
LANGUAGE sql
AS $procedure$
    DELETE FROM public.auth_login_devices
    WHERE lower(email) = lower(p_email);
$procedure$;