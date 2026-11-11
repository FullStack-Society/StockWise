BEGIN;

ALTER TABLE public.user_settings
    ADD COLUMN IF NOT EXISTS login_alert_emails boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS auto_sign_out_idle boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.auth_login_devices (
    email varchar(320) NOT NULL,
    device_hash char(64) NOT NULL,
    first_seen_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (email, device_hash)
);

INSERT INTO public.schema_migrations (version, name)
VALUES ('021', 'Login alert email and idle sign-out preferences')
ON CONFLICT (version) DO NOTHING;

COMMIT;
