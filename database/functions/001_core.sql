

CREATE OR REPLACE FUNCTION public.org_get_my_organizations(p_email text)
RETURNS TABLE(organization_id integer, organization_name text, role text)
LANGUAGE sql STABLE
AS $function$
    SELECT o.organization_id, o.organization_name::text, m.role::text
    FROM public.organization_memberships AS m
    JOIN public.organizations AS o USING (organization_id)
    WHERE lower(m.email) = lower(btrim(p_email))
      AND m.status = 'active'
    ORDER BY o.organization_name;
$function$;

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
        SELECT 1 FROM public.auth_users
        WHERE lower(email) = v_email AND is_active = TRUE
        UNION ALL
        SELECT 1 FROM public.users WHERE lower(email) = v_email
    ) THEN
        RAISE EXCEPTION 'A StockWise account is required to create an organization'
            USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.organizations (organization_name, created_by_email)
    VALUES (btrim(p_organization_name), v_email)
    RETURNING organizations.organization_id INTO v_organization_id;

    INSERT INTO public.organization_memberships (organization_id, email, role)
    VALUES (v_organization_id, v_email, 'owner');

    RETURN QUERY
    SELECT v_organization_id, btrim(p_organization_name)::text, 'owner'::text;
END;
$function$;

CREATE OR REPLACE FUNCTION public.org_get_pending_invitations(p_email text)
RETURNS TABLE(
    invitation_id bigint,
    organization_id integer,
    organization_name text,
    role text,
    invited_by_email text,
    created_at timestamptz
)
LANGUAGE sql STABLE
AS $function$
    SELECT i.invitation_id, i.organization_id, o.organization_name::text,
           i.role::text, i.invited_by_email::text, i.created_at
    FROM public.organization_invitations AS i
    JOIN public.organizations AS o USING (organization_id)
    WHERE lower(i.email) = lower(btrim(p_email))
      AND i.status = 'pending'
    ORDER BY i.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.org_get_member_role(
    p_organization_id integer, p_email text
)
RETURNS text
LANGUAGE sql STABLE
AS $function$
    SELECT m.role::text
    FROM public.organization_memberships AS m
    WHERE m.organization_id = p_organization_id
      AND lower(m.email) = lower(btrim(p_email))
      AND m.status = 'active';
$function$;

CREATE OR REPLACE FUNCTION public.org_respond_to_invitation(
    p_invitation_id bigint, p_email text, p_accept boolean
)
RETURNS TABLE(organization_id integer, organization_name text, role text)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_invitation public.organization_invitations%ROWTYPE;
BEGIN
    SELECT * INTO v_invitation
    FROM public.organization_invitations
    WHERE invitation_id = p_invitation_id
      AND lower(email) = lower(btrim(p_email))
      AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation was not found or is no longer pending'
            USING ERRCODE = 'P0002';
    END IF;

    IF p_accept THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.auth_users
            WHERE lower(email) = lower(btrim(p_email)) AND is_active = TRUE
            UNION ALL
            SELECT 1 FROM public.users
            WHERE lower(email) = lower(btrim(p_email))
        ) THEN
            RAISE EXCEPTION 'A StockWise account is required to accept this invitation'
                USING ERRCODE = 'P0002';
        END IF;

        INSERT INTO public.organization_memberships (organization_id, email, role)
        VALUES (v_invitation.organization_id, lower(btrim(p_email)), v_invitation.role)
        ON CONFLICT (organization_id, email)
        DO UPDATE SET role = EXCLUDED.role, status = 'active';

        UPDATE public.organization_invitations
        SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
        WHERE invitation_id = p_invitation_id;

        RETURN QUERY
        SELECT o.organization_id, o.organization_name::text, v_invitation.role::text
        FROM public.organizations AS o
        WHERE o.organization_id = v_invitation.organization_id;
    ELSE
        UPDATE public.organization_invitations
        SET status = 'declined', responded_at = CURRENT_TIMESTAMP
        WHERE invitation_id = p_invitation_id;
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.org_invite_member(
    p_organization_id integer,
    p_actor_email text,
    p_email text,
    p_role text
)
RETURNS bigint
LANGUAGE plpgsql
AS $function$
DECLARE
    v_actor_role text;
    v_email text := lower(btrim(p_email));
    v_role text := lower(btrim(p_role));
    v_invitation_id bigint;
BEGIN
    SELECT role INTO v_actor_role
    FROM public.organization_memberships
    WHERE organization_id = p_organization_id
      AND lower(email) = lower(btrim(p_actor_email))
      AND status = 'active';

    IF NOT FOUND OR v_actor_role NOT IN ('owner', 'admin') THEN
        RAISE EXCEPTION 'Only an owner or admin can invite members'
            USING ERRCODE = '42501';
    END IF;

    IF v_role NOT IN ('admin', 'staff')
       OR (v_actor_role = 'admin' AND v_role <> 'staff') THEN
        RAISE EXCEPTION 'You are not allowed to assign this role'
            USING ERRCODE = '42501';
    END IF;

    IF v_email = lower(btrim(p_actor_email)) THEN
        RAISE EXCEPTION 'You cannot invite your own account'
            USING ERRCODE = '22023';
    END IF;

    IF v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
        RAISE EXCEPTION 'A valid email address is required'
            USING ERRCODE = '22023';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.organization_memberships
        WHERE organization_id = p_organization_id
          AND lower(email) = v_email
    ) THEN
        RAISE EXCEPTION 'This user is already a member of the organization'
            USING ERRCODE = '23505';
    END IF;

    INSERT INTO public.organization_invitations (
        organization_id, email, role, invited_by_email
    ) VALUES (
        p_organization_id, v_email, v_role, lower(btrim(p_actor_email))
    ) RETURNING invitation_id INTO v_invitation_id;

    RETURN v_invitation_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.org_list_members(
    p_organization_id integer, p_actor_email text
)
RETURNS TABLE(
    email text, full_name text, role text, status text, joined_at timestamptz
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_actor_role text;
BEGIN
    SELECT m.role INTO v_actor_role
    FROM public.organization_memberships AS m
    WHERE m.organization_id = p_organization_id
      AND lower(m.email) = lower(btrim(p_actor_email))
      AND m.status = 'active';

    IF NOT FOUND OR v_actor_role NOT IN ('owner', 'admin') THEN
        RAISE EXCEPTION 'Only an owner or admin can view organization members'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT m.email::text,
           COALESCE(
               (SELECT au.name FROM public.auth_users AS au
                WHERE lower(au.email) = lower(m.email) ORDER BY au.id LIMIT 1),
               (SELECT u.full_name FROM public.users AS u
                WHERE lower(u.email) = lower(m.email) ORDER BY u.user_id LIMIT 1),
               split_part(m.email, '@', 1)
           )::text,
           m.role::text, 'Active'::text, m.joined_at
    FROM public.organization_memberships AS m
    WHERE m.organization_id = p_organization_id AND m.status = 'active'
    UNION ALL
    SELECT i.email::text,
           COALESCE(
               (SELECT au.name FROM public.auth_users AS au
                WHERE lower(au.email) = lower(i.email) ORDER BY au.id LIMIT 1),
               (SELECT u.full_name FROM public.users AS u
                WHERE lower(u.email) = lower(i.email) ORDER BY u.user_id LIMIT 1),
               split_part(i.email, '@', 1)
           )::text,
           i.role::text, 'Invited'::text, NULL::timestamptz
    FROM public.organization_invitations AS i
    WHERE i.organization_id = p_organization_id AND i.status = 'pending'
    ORDER BY 2;
END;
$function$;

CREATE OR REPLACE FUNCTION public.org_remove_member(
    p_organization_id integer, p_actor_email text, p_target_email text
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
    v_actor_role text;
    v_target_role text;
BEGIN
    SELECT role INTO v_actor_role
    FROM public.organization_memberships
    WHERE organization_id = p_organization_id
      AND lower(email) = lower(btrim(p_actor_email))
      AND status = 'active';

    SELECT role INTO v_target_role
    FROM public.organization_memberships
    WHERE organization_id = p_organization_id
      AND lower(email) = lower(btrim(p_target_email))
      AND status = 'active';

    IF NOT FOUND THEN
        SELECT role INTO v_target_role
        FROM public.organization_invitations
        WHERE organization_id = p_organization_id
          AND lower(email) = lower(btrim(p_target_email))
          AND status = 'pending'
        ORDER BY created_at DESC LIMIT 1;
    END IF;

    IF v_actor_role NOT IN ('owner', 'admin') OR v_actor_role IS NULL THEN
        RAISE EXCEPTION 'Only an owner or admin can remove members'
            USING ERRCODE = '42501';
    END IF;
    IF v_target_role IS NULL THEN
        RETURN FALSE;
    END IF;
    IF v_target_role = 'owner'
       OR (v_actor_role = 'admin' AND v_target_role <> 'staff') THEN
        RAISE EXCEPTION 'You are not allowed to remove this member'
            USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.organization_memberships
    WHERE organization_id = p_organization_id
      AND lower(email) = lower(btrim(p_target_email));
    UPDATE public.organization_invitations
    SET status = 'revoked', responded_at = CURRENT_TIMESTAMP
    WHERE organization_id = p_organization_id
      AND lower(email) = lower(btrim(p_target_email))
      AND status = 'pending';
    RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.org_leave(
    p_organization_id integer, p_email text
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
    v_role text;
BEGIN
    SELECT role INTO v_role
    FROM public.organization_memberships
    WHERE organization_id = p_organization_id
      AND lower(email) = lower(btrim(p_email))
      AND status = 'active';

    IF v_role IS NULL THEN RETURN FALSE; END IF;
    IF v_role = 'owner' THEN
        RAISE EXCEPTION 'The owner must transfer ownership before leaving'
            USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.organization_memberships
    WHERE organization_id = p_organization_id
      AND lower(email) = lower(btrim(p_email));
    RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.org_change_member_role(
    p_organization_id integer, p_actor_email text,
    p_target_email text, p_new_role text
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
    v_actor_role text;
    v_target_role text;
BEGIN
    SELECT role INTO v_actor_role
    FROM public.organization_memberships
    WHERE organization_id = p_organization_id
      AND lower(email) = lower(btrim(p_actor_email))
      AND status = 'active';
    SELECT role INTO v_target_role
    FROM public.organization_memberships
    WHERE organization_id = p_organization_id
      AND lower(email) = lower(btrim(p_target_email))
      AND status = 'active';

    IF v_actor_role <> 'owner' OR v_actor_role IS NULL THEN
        RAISE EXCEPTION 'Only the owner can change member roles'
            USING ERRCODE = '42501';
    END IF;
    IF v_target_role IS NULL THEN RETURN FALSE; END IF;
    IF v_target_role = 'owner' OR lower(p_new_role) NOT IN ('admin', 'staff') THEN
        RAISE EXCEPTION 'This role change is not allowed'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.organization_memberships
    SET role = lower(p_new_role)
    WHERE organization_id = p_organization_id
      AND lower(email) = lower(btrim(p_target_email));
    RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.organization_get_inventory(
    p_organization_id integer,
    p_search text DEFAULT NULL,
    p_category_id integer DEFAULT NULL,
    p_stock_status text DEFAULT NULL
)
RETURNS TABLE(
    product_id integer, product_name text, sku text, category_id integer,
    description text, price numeric, quantity integer, minimum_stock integer,
    created_at timestamptz, updated_at timestamptz,
    category_name text, status text
)
LANGUAGE sql STABLE
AS $function$
    SELECT p.product_id, p.product_name::text, p.sku::text, p.category_id,
           p.description::text, p.price, p.quantity, p.minimum_stock,
           p.created_at, p.updated_at, c.category_name::text,
           public.inventory_status(p.quantity, p.minimum_stock)::text
    FROM public.products AS p
    LEFT JOIN public.categories AS c
      ON c.category_id = p.category_id
     AND c.organization_id = p.organization_id
    WHERE p.organization_id = p_organization_id
      AND p.is_deleted = FALSE
      AND (NULLIF(btrim(p_search), '') IS NULL
           OR p.product_name ILIKE '%' || btrim(p_search) || '%'
           OR p.sku ILIKE '%' || btrim(p_search) || '%')
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (NULLIF(btrim(p_stock_status), '') IS NULL
           OR public.inventory_status(p.quantity, p.minimum_stock) = btrim(p_stock_status))
    ORDER BY p.product_id DESC;
$function$;

CREATE OR REPLACE FUNCTION public.organization_get_inventory_by_id(
    p_organization_id integer, p_product_id integer
)
RETURNS TABLE(
    product_id integer, product_name text, sku text, category_id integer,
    description text, price numeric, quantity integer, minimum_stock integer,
    created_at timestamptz, updated_at timestamptz,
    category_name text, status text
)
LANGUAGE sql STABLE
AS $function$
    SELECT p.product_id, p.product_name::text, p.sku::text, p.category_id,
           p.description::text, p.price, p.quantity, p.minimum_stock,
           p.created_at, p.updated_at, c.category_name::text,
           public.inventory_status(p.quantity, p.minimum_stock)::text
    FROM public.products AS p
    LEFT JOIN public.categories AS c
      ON c.category_id = p.category_id
     AND c.organization_id = p.organization_id
    WHERE p.organization_id = p_organization_id
      AND p.product_id = p_product_id
      AND p.is_deleted = FALSE;
$function$;

CREATE OR REPLACE FUNCTION public.organization_get_categories(p_organization_id integer)
RETURNS TABLE(category_id integer, category_name text, description text)
LANGUAGE sql STABLE
AS $function$
    SELECT c.category_id, c.category_name::text, c.description::text
    FROM public.categories AS c
    WHERE c.organization_id = p_organization_id
    ORDER BY c.category_name;
$function$;

CREATE OR REPLACE FUNCTION public.organization_create_inventory(
    p_organization_id integer, p_product_name text, p_sku text,
    p_category_id integer, p_description text, p_price numeric,
    p_quantity integer, p_minimum_stock integer
)
RETURNS TABLE(
    product_id integer, product_name text, sku text, category_id integer,
    description text, price numeric, quantity integer, minimum_stock integer,
    created_at timestamptz, updated_at timestamptz,
    category_name text, status text
)
LANGUAGE plpgsql
AS $function$
DECLARE v_product_id integer;
BEGIN
    IF NULLIF(btrim(p_product_name), '') IS NULL
       OR NULLIF(btrim(p_sku), '') IS NULL THEN
        RAISE EXCEPTION 'Product name and SKU are required' USING ERRCODE = '22023';
    END IF;
    IF p_price IS NULL OR p_quantity IS NULL OR p_minimum_stock IS NULL
       OR p_price < 0 OR p_quantity < 0 OR p_minimum_stock < 0 THEN
        RAISE EXCEPTION 'Price, quantity, and minimum stock must be non-negative'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.products (
        organization_id, product_name, sku, category_id, description,
        price, quantity, minimum_stock
    ) VALUES (
        p_organization_id, btrim(p_product_name), btrim(p_sku), p_category_id,
        p_description, p_price, p_quantity, p_minimum_stock
    ) RETURNING products.product_id INTO v_product_id;

    RETURN QUERY SELECT * FROM public.organization_get_inventory_by_id(
        p_organization_id, v_product_id
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.organization_update_inventory(
    p_organization_id integer, p_product_id integer,
    p_product_name text, p_sku text, p_category_id integer,
    p_description text, p_price numeric, p_quantity integer,
    p_minimum_stock integer
)
RETURNS TABLE(
    product_id integer, product_name text, sku text, category_id integer,
    description text, price numeric, quantity integer, minimum_stock integer,
    created_at timestamptz, updated_at timestamptz,
    category_name text, status text
)
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NULLIF(btrim(p_product_name), '') IS NULL
       OR NULLIF(btrim(p_sku), '') IS NULL THEN
        RAISE EXCEPTION 'Product name and SKU are required' USING ERRCODE = '22023';
    END IF;
    IF p_price IS NULL OR p_quantity IS NULL OR p_minimum_stock IS NULL
       OR p_price < 0 OR p_quantity < 0 OR p_minimum_stock < 0 THEN
        RAISE EXCEPTION 'Price, quantity, and minimum stock must be non-negative'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.products AS p
    SET product_name = btrim(p_product_name), sku = btrim(p_sku),
        category_id = p_category_id, description = p_description,
        price = p_price, quantity = p_quantity,
        minimum_stock = p_minimum_stock, updated_at = CURRENT_TIMESTAMP
    WHERE p.organization_id = p_organization_id
      AND p.product_id = p_product_id
      AND p.is_deleted = FALSE;

    IF NOT FOUND THEN RETURN; END IF;
    RETURN QUERY SELECT * FROM public.organization_get_inventory_by_id(
        p_organization_id, p_product_id
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.organization_delete_inventory(
    p_organization_id integer, p_product_id integer
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.products
    SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE organization_id = p_organization_id
      AND product_id = p_product_id
      AND is_deleted = FALSE;
    RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.org_respond_to_invitation(
    p_invitation_id bigint, p_email text, p_accept boolean
)
RETURNS TABLE(organization_id integer, organization_name text, role text)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_invitation public.organization_invitations%ROWTYPE;
BEGIN
    SELECT * INTO v_invitation
    FROM public.organization_invitations
    WHERE invitation_id = p_invitation_id
      AND lower(email) = lower(btrim(p_email))
      AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation was not found or is no longer pending'
            USING ERRCODE = 'P0002';
    END IF;

    IF p_accept THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.auth_users
            WHERE lower(email) = lower(btrim(p_email)) AND is_active = TRUE
            UNION ALL
            SELECT 1 FROM public.users
            WHERE lower(email) = lower(btrim(p_email))
        ) THEN
            RAISE EXCEPTION 'A StockWise account is required to accept this invitation'
                USING ERRCODE = 'P0002';
        END IF;

        INSERT INTO public.organization_memberships (organization_id, email, role)
        VALUES (v_invitation.organization_id, lower(btrim(p_email)), v_invitation.role)
        ON CONFLICT ON CONSTRAINT organization_memberships_pkey
        DO UPDATE SET role = EXCLUDED.role, status = 'active';

        UPDATE public.organization_invitations
        SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
        WHERE invitation_id = p_invitation_id;

        RETURN QUERY
        SELECT o.organization_id, o.organization_name::text, v_invitation.role::text
        FROM public.organizations AS o
        WHERE o.organization_id = v_invitation.organization_id;
    ELSE
        UPDATE public.organization_invitations
        SET status = 'declined', responded_at = CURRENT_TIMESTAMP
        WHERE invitation_id = p_invitation_id;
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.organization_inventory_status(p_quantity integer)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $function$
    SELECT CASE
        WHEN p_quantity <= 25 THEN 'Critical'
        WHEN p_quantity <= 50 THEN 'Low stock'
        ELSE 'In stock'
    END;
$function$;

CREATE FUNCTION public.organization_get_inventory(
    p_organization_id integer,
    p_search text DEFAULT NULL,
    p_category_id integer DEFAULT NULL,
    p_stock_status text DEFAULT NULL
)
RETURNS TABLE(
    product_id integer, product_name text, sku text, category_id integer,
    description text, price numeric, quantity integer,
    created_at timestamptz, updated_at timestamptz,
    category_name text, status text
)
LANGUAGE sql STABLE
AS $function$
    SELECT p.product_id, p.product_name::text, p.sku::text, p.category_id,
           p.description::text, p.price, p.quantity,
           p.created_at, p.updated_at, c.category_name::text,
           public.organization_inventory_status(p.quantity)
    FROM public.products AS p
    LEFT JOIN public.categories AS c
      ON c.category_id = p.category_id
     AND c.organization_id = p.organization_id
    WHERE p.organization_id = p_organization_id
      AND p.is_deleted = FALSE
      AND (NULLIF(btrim(p_search), '') IS NULL
           OR p.product_name ILIKE '%' || btrim(p_search) || '%'
           OR p.sku ILIKE '%' || btrim(p_search) || '%')
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (NULLIF(btrim(p_stock_status), '') IS NULL
           OR public.organization_inventory_status(p.quantity) = btrim(p_stock_status))
    ORDER BY p.product_id DESC;
$function$;

CREATE FUNCTION public.organization_get_inventory_by_id(
    p_organization_id integer, p_product_id integer
)
RETURNS TABLE(
    product_id integer, product_name text, sku text, category_id integer,
    description text, price numeric, quantity integer,
    created_at timestamptz, updated_at timestamptz,
    category_name text, status text
)
LANGUAGE sql STABLE
AS $function$
    SELECT p.product_id, p.product_name::text, p.sku::text, p.category_id,
           p.description::text, p.price, p.quantity,
           p.created_at, p.updated_at, c.category_name::text,
           public.organization_inventory_status(p.quantity)
    FROM public.products AS p
    LEFT JOIN public.categories AS c
      ON c.category_id = p.category_id
     AND c.organization_id = p.organization_id
    WHERE p.organization_id = p_organization_id
      AND p.product_id = p_product_id
      AND p.is_deleted = FALSE;
$function$;

CREATE FUNCTION public.organization_create_inventory(
    p_organization_id integer, p_product_name text, p_sku text,
    p_category_id integer, p_description text, p_price numeric,
    p_quantity integer
)
RETURNS TABLE(
    product_id integer, product_name text, sku text, category_id integer,
    description text, price numeric, quantity integer,
    created_at timestamptz, updated_at timestamptz,
    category_name text, status text
)
LANGUAGE plpgsql
AS $function$
DECLARE v_product_id integer;
BEGIN
    IF NULLIF(btrim(p_product_name), '') IS NULL
       OR NULLIF(btrim(p_sku), '') IS NULL THEN
        RAISE EXCEPTION 'Product name and SKU are required'
            USING ERRCODE = '22023';
    END IF;
    IF p_price IS NULL OR p_quantity IS NULL
       OR p_price < 0 OR p_quantity < 0 THEN
        RAISE EXCEPTION 'Price and quantity must be non-negative'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.products (
        organization_id, product_name, sku, category_id, description,
        price, quantity
    ) VALUES (
        p_organization_id, btrim(p_product_name), btrim(p_sku), p_category_id,
        p_description, p_price, p_quantity
    ) RETURNING products.product_id INTO v_product_id;

    RETURN QUERY SELECT * FROM public.organization_get_inventory_by_id(
        p_organization_id, v_product_id
    );
END;
$function$;

CREATE FUNCTION public.organization_update_inventory(
    p_organization_id integer, p_product_id integer,
    p_product_name text, p_sku text, p_category_id integer,
    p_description text, p_price numeric, p_quantity integer
)
RETURNS TABLE(
    product_id integer, product_name text, sku text, category_id integer,
    description text, price numeric, quantity integer,
    created_at timestamptz, updated_at timestamptz,
    category_name text, status text
)
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NULLIF(btrim(p_product_name), '') IS NULL
       OR NULLIF(btrim(p_sku), '') IS NULL THEN
        RAISE EXCEPTION 'Product name and SKU are required'
            USING ERRCODE = '22023';
    END IF;
    IF p_price IS NULL OR p_quantity IS NULL
       OR p_price < 0 OR p_quantity < 0 THEN
        RAISE EXCEPTION 'Price and quantity must be non-negative'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.products AS p
    SET product_name = btrim(p_product_name), sku = btrim(p_sku),
        category_id = p_category_id, description = p_description,
        price = p_price, quantity = p_quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE p.organization_id = p_organization_id
      AND p.product_id = p_product_id
      AND p.is_deleted = FALSE;

    IF NOT FOUND THEN RETURN; END IF;
    RETURN QUERY SELECT * FROM public.organization_get_inventory_by_id(
        p_organization_id, p_product_id
    );
END;
$function$;