BEGIN;

CREATE OR REPLACE FUNCTION public.org_delete_leave_notification(
    p_notification_id bigint, p_email text
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM public.organization_leave_notifications AS n
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

INSERT INTO public.schema_migrations (version, name)
VALUES ('010', 'Organization leave notification deletion')
ON CONFLICT (version) DO NOTHING;

COMMIT;
