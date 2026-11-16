-- Current organization creation routine; location-based inventory routines were removed.

CREATE OR REPLACE FUNCTION public.org_create_organization(
    p_email text, p_organization_name text
)
RETURNS TABLE(organization_id integer, organization_name text, role text)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_email text := lower(btrim(p_email));
    v_organization_id integer;
BEGIN
    IF NULLIF(btrim(p_organization_name), '') IS NULL
       OR length(btrim(p_organization_name)) > 160 THEN
        RAISE EXCEPTION 'Organization name must be between 1 and 160 characters'
            USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE lower(email) = v_email
          AND is_active = TRUE AND is_deleted = FALSE
    ) THEN
        RAISE EXCEPTION 'A StockWise account is required to create an organization'
            USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.organizations (organization_name, created_by_email)
    VALUES (btrim(p_organization_name), v_email)
    RETURNING organizations.organization_id INTO v_organization_id;

    INSERT INTO public.organization_memberships (organization_id, email, role)
    VALUES (v_organization_id, v_email, 'owner');

    PERFORM public.stockwise_ensure_default_categories(v_organization_id);

    RETURN QUERY
    SELECT v_organization_id, btrim(p_organization_name)::text, 'owner'::text;
END;
$function$;
