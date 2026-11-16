

CREATE OR REPLACE FUNCTION public.org_leave(
    p_organization_id integer, p_email text
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
    v_role text;
    v_actor_email text := lower(btrim(p_email));
    v_actor_name text;
    v_organization_name text;
BEGIN
    SELECT role INTO v_role
    FROM public.organization_memberships
    WHERE organization_id = p_organization_id
      AND lower(email) = v_actor_email
      AND status = 'active';

    IF v_role IS NULL THEN RETURN FALSE; END IF;
    IF v_role = 'owner' THEN
        RAISE EXCEPTION 'The owner must transfer ownership before leaving'
            USING ERRCODE = '42501';
    END IF;

    SELECT COALESCE(
        (SELECT u.full_name
         FROM public.users AS u
         WHERE lower(u.email) = v_actor_email
         ORDER BY u.user_id
         LIMIT 1),
        split_part(v_actor_email, '@', 1)
    )
    INTO v_actor_name;

    SELECT organization_name
    INTO v_organization_name
    FROM public.organizations
    WHERE organization_id = p_organization_id;

    INSERT INTO public.organization_leave_notifications (
        organization_id,
        recipient_email,
        actor_email,
        actor_name,
        organization_name
    )
    SELECT DISTINCT p_organization_id,
           lower(m.email),
           v_actor_email,
           v_actor_name,
           v_organization_name
    FROM public.organization_memberships AS m
    WHERE m.organization_id = p_organization_id
      AND m.status = 'active'
      AND m.role IN ('owner', 'manager')
      AND lower(m.email) <> v_actor_email;

    DELETE FROM public.organization_memberships
    WHERE organization_id = p_organization_id
      AND lower(email) = v_actor_email;
    RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.org_get_leave_notifications(
    p_email text
)
RETURNS TABLE(
    notification_id bigint,
    organization_id integer,
    organization_name text,
    actor_email text,
    actor_name text,
    created_at timestamptz,
    read_at timestamptz
)
LANGUAGE sql
STABLE
AS $function$
    SELECT n.notification_id,
           n.organization_id,
           n.organization_name::text,
           n.actor_email::text,
           n.actor_name::text,
           n.created_at,
           n.read_at
    FROM public.organization_leave_notifications AS n
    WHERE lower(n.recipient_email) = lower(btrim(p_email))
      AND EXISTS (
          SELECT 1
          FROM public.organization_memberships AS m
          WHERE m.organization_id = n.organization_id
            AND lower(m.email) = lower(btrim(p_email))
            AND m.status = 'active'
            AND m.role IN ('owner', 'manager')
      )
    ORDER BY (n.read_at IS NULL) DESC,
             n.created_at DESC,
             n.notification_id DESC
    LIMIT 50;
$function$;

CREATE OR REPLACE FUNCTION public.org_mark_leave_notification_read(
    p_notification_id bigint, p_email text
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.organization_leave_notifications AS n
    SET read_at = COALESCE(n.read_at, CURRENT_TIMESTAMP)
    WHERE n.notification_id = p_notification_id
      AND lower(n.recipient_email) = lower(btrim(p_email))
      AND EXISTS (
          SELECT 1
          FROM public.organization_memberships AS m
          WHERE m.organization_id = n.organization_id
            AND lower(m.email) = lower(btrim(p_email))
            AND m.status = 'active'
            AND m.role IN ('owner', 'manager')
      );
    RETURN FOUND;
END;
$function$;