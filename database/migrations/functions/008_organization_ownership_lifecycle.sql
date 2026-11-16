

CREATE OR REPLACE FUNCTION public.org_transfer_ownership(
    p_organization_id integer,
    p_actor_email text,
    p_target_email text
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
    v_actor_role text;
    v_target_role text;
    v_actor_email text := lower(btrim(p_actor_email));
    v_target_email text := lower(btrim(p_target_email));
BEGIN
    IF v_actor_email = v_target_email THEN
        RAISE EXCEPTION 'Choose another active organization member'
            USING ERRCODE = '22023';
    END IF;

    SELECT membership.role INTO v_actor_role
    FROM public.organization_memberships AS membership
    WHERE membership.organization_id = p_organization_id
      AND lower(membership.email) = v_actor_email
      AND membership.status = 'active'
    FOR UPDATE;

    IF v_actor_role IS DISTINCT FROM 'owner' THEN
        RAISE EXCEPTION 'Only the organization owner can transfer ownership'
            USING ERRCODE = '42501';
    END IF;

    SELECT membership.role INTO v_target_role
    FROM public.organization_memberships AS membership
    WHERE membership.organization_id = p_organization_id
      AND lower(membership.email) = v_target_email
      AND membership.status = 'active'
    FOR UPDATE;

    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'The new owner must be an active organization member'
            USING ERRCODE = 'P0002';
    END IF;
    IF v_target_role = 'owner' THEN
        RAISE EXCEPTION 'This member already owns the organization'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.organization_memberships
    SET role = 'manager'
    WHERE organization_id = p_organization_id
      AND lower(email) = v_actor_email
      AND status = 'active';
    UPDATE public.organization_memberships
    SET role = 'owner'
    WHERE organization_id = p_organization_id
      AND lower(email) = v_target_email
      AND status = 'active';

    RETURN TRUE;
END;
$function$;



CREATE OR REPLACE FUNCTION public.stockwise_settings_delete_account(
    p_email text
)
RETURNS TABLE(owner_membership boolean, account_found boolean)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_count integer;
BEGIN
    owner_membership := EXISTS (
        SELECT 1
        FROM public.organization_memberships AS membership
        WHERE lower(membership.email) = lower(btrim(p_email))
          AND membership.status = 'active'
          AND membership.role = 'owner'
    );
    IF owner_membership THEN
        account_found := true;
        RETURN NEXT;
        RETURN;
    END IF;

    UPDATE public.users
    SET is_active = false, is_deleted = true,
        deleted_at = CURRENT_TIMESTAMP
    WHERE lower(email) = lower(btrim(p_email)) AND is_deleted = false;
    GET DIAGNOSTICS v_user_count = ROW_COUNT;

    account_found := v_user_count > 0;
    IF account_found THEN
        UPDATE public.organization_memberships
        SET status = 'account_deleted'
        WHERE lower(email) = lower(btrim(p_email)) AND status = 'active';
        UPDATE public.organization_invitations
        SET status = 'revoked', responded_at = CURRENT_TIMESTAMP
        WHERE lower(email) = lower(btrim(p_email)) AND status = 'pending';
    END IF;

    owner_membership := false;
    RETURN NEXT;
END;
$function$;