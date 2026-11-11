BEGIN;

CREATE TABLE IF NOT EXISTS public.organization_member_presence (
    organization_id integer NOT NULL,
    email varchar(320) NOT NULL,
    last_seen_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, email),
    FOREIGN KEY (organization_id, email)
        REFERENCES public.organization_memberships(organization_id, email)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.organization_member_login_notifications (
    notification_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id integer NOT NULL,
    recipient_email varchar(320) NOT NULL,
    actor_email varchar(320) NOT NULL,
    actor_name varchar(160) NOT NULL,
    actor_role varchar(20) NOT NULL CHECK (actor_role IN ('manager', 'staff')),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at timestamptz,
    FOREIGN KEY (organization_id, recipient_email)
        REFERENCES public.organization_memberships(organization_id, email)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS organization_member_login_notifications_recipient_idx
    ON public.organization_member_login_notifications
       (organization_id, lower(recipient_email), created_at DESC);

INSERT INTO public.schema_migrations (version, name)
VALUES ('019', 'Organization member presence and login notifications')
ON CONFLICT (version) DO NOTHING;

COMMIT;
