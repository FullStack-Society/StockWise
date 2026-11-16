

CREATE OR REPLACE PROCEDURE public.stockwise_record_organization_presence(
    IN p_organization_id integer,
    IN p_email text
)
LANGUAGE sql
AS $procedure$
    INSERT INTO public.organization_member_presence (
        organization_id, email, last_seen_at
    ) VALUES (p_organization_id, lower(p_email), CURRENT_TIMESTAMP)
    ON CONFLICT (organization_id, email)
    DO UPDATE SET last_seen_at = CURRENT_TIMESTAMP
$procedure$;

CREATE OR REPLACE PROCEDURE public.stockwise_notify_organization_member_login(
    IN p_organization_id integer,
    IN p_email text,
    IN p_role text
)
LANGUAGE sql
AS $procedure$
    INSERT INTO public.organization_member_login_notifications (
        organization_id, recipient_email, actor_email, actor_name, actor_role
    )
    SELECT p_organization_id, recipient.email, lower(p_email),
           COALESCE(
               (SELECT account.full_name
                FROM public.users AS account
                WHERE lower(account.email) = lower(p_email)
                ORDER BY account.user_id LIMIT 1),
               split_part(lower(p_email), '@', 1)
           ),
           p_role
    FROM public.organization_memberships AS recipient
    WHERE recipient.organization_id = p_organization_id
      AND recipient.status = 'active'
      AND recipient.role IN ('owner', 'manager')
      AND lower(recipient.email) <> lower(p_email)
      AND NOT EXISTS (
          SELECT 1
          FROM public.organization_member_login_notifications AS recent
          WHERE recent.organization_id = recipient.organization_id
            AND lower(recent.recipient_email) = lower(recipient.email)
            AND lower(recent.actor_email) = lower(p_email)
            AND recent.created_at >= CURRENT_TIMESTAMP - interval '15 minutes'
      )
$procedure$;

CREATE OR REPLACE PROCEDURE public.stockwise_mark_organization_login_notification_read(
    IN p_notification_id integer,
    IN p_organization_id integer,
    IN p_email text,
    OUT p_marked boolean
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
    UPDATE public.organization_member_login_notifications
    SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
    WHERE notification_id = p_notification_id
      AND organization_id = p_organization_id
      AND lower(recipient_email) = lower(p_email);
    p_marked := FOUND;
END;
$procedure$;

CREATE OR REPLACE PROCEDURE public.stockwise_set_merchant_qr(
    IN p_organization_id integer,
    IN p_image_data text,
    IN p_email text
)
LANGUAGE sql
AS $procedure$
    INSERT INTO public.organization_payment_settings (
        organization_id, merchant_qr_data, updated_by_email, updated_at
    ) VALUES (p_organization_id, p_image_data, p_email, CURRENT_TIMESTAMP)
    ON CONFLICT (organization_id) DO UPDATE
    SET merchant_qr_data = EXCLUDED.merchant_qr_data,
        updated_by_email = EXCLUDED.updated_by_email,
        updated_at = CURRENT_TIMESTAMP
$procedure$;

CREATE OR REPLACE PROCEDURE public.stockwise_record_usage_page_view(
    IN p_organization_id integer,
    IN p_page text,
    IN p_email text
)
LANGUAGE sql
AS $procedure$
    INSERT INTO public.stockwise_usage_daily (
        organization_id, usage_date, page_key, view_count
    )
    SELECT p_organization_id, CURRENT_DATE, p_page, 1
    WHERE EXISTS (
        SELECT 1
        FROM public.user_settings
        WHERE lower(email) = lower(p_email)
          AND usage_analytics = true
    )
    ON CONFLICT (organization_id, usage_date, page_key)
    DO UPDATE SET view_count = public.stockwise_usage_daily.view_count + 1
$procedure$;

CREATE OR REPLACE PROCEDURE public.stockwise_record_sale(
    IN p_organization_id integer,
    IN p_email text,
    IN p_sale_id uuid,
    IN p_payment_method text,
    IN p_items jsonb,
    OUT p_items_sold integer
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_item record;
    v_price numeric(14, 2);
    v_product_count integer;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.sales
        WHERE organization_id = p_organization_id
          AND sale_id = p_sale_id
    ) THEN
        SELECT COUNT(item.product_id)::integer
        INTO p_items_sold
        FROM public.sale_items AS item
        WHERE item.organization_id = p_organization_id
          AND item.sale_id = p_sale_id;
        RETURN;
    END IF;

    PERFORM 1
    FROM public.products AS product
    WHERE product.organization_id = p_organization_id
      AND product.product_id IN (
          SELECT item.product_id
          FROM jsonb_to_recordset(p_items) AS item(product_id integer, quantity integer)
      )
      AND product.is_deleted = false
    ORDER BY product.product_id
    FOR UPDATE;

    SELECT COUNT(*)::integer
    INTO v_product_count
    FROM public.products AS product
    WHERE product.organization_id = p_organization_id
      AND product.product_id IN (
          SELECT item.product_id
          FROM jsonb_to_recordset(p_items) AS item(product_id integer, quantity integer)
      )
      AND product.is_deleted = false;

    IF v_product_count <> jsonb_array_length(p_items) THEN
        RAISE EXCEPTION 'A product in this sale no longer exists.'
            USING ERRCODE = 'P0002';
    END IF;

    PERFORM set_config('app.actor_email', p_email, true);

    BEGIN
        INSERT INTO public.sales (
            organization_id, sale_id, payment_method, created_by_email
        ) VALUES (
            p_organization_id, p_sale_id, p_payment_method, p_email
        );
    EXCEPTION WHEN unique_violation THEN
        IF EXISTS (
            SELECT 1
            FROM public.sales
            WHERE organization_id = p_organization_id
              AND sale_id = p_sale_id
        ) THEN
            SELECT COUNT(item.product_id)::integer
            INTO p_items_sold
            FROM public.sale_items AS item
            WHERE item.organization_id = p_organization_id
              AND item.sale_id = p_sale_id;
            RETURN;
        END IF;
        RAISE;
    END;

    FOR v_item IN
        SELECT item.product_id, item.quantity
        FROM jsonb_to_recordset(p_items) AS item(product_id integer, quantity integer)
        ORDER BY item.product_id
    LOOP
        SELECT product.price
        INTO v_price
        FROM public.products AS product
        WHERE product.organization_id = p_organization_id
          AND product.product_id = v_item.product_id
          AND product.is_deleted = false;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'A product in this sale no longer exists.'
                USING ERRCODE = 'P0002';
        END IF;

        INSERT INTO public.sale_items (
            organization_id, sale_id, product_id, quantity, unit_price
        ) VALUES (
            p_organization_id, p_sale_id, v_item.product_id, v_item.quantity, v_price
        );

        PERFORM public.stockwise_adjust_inventory_stock(
            p_organization_id,
            p_email,
            v_item.product_id,
            'OUT',
            v_item.quantity,
            format('Sale %s | payment:%s', p_sale_id, p_payment_method)
        );
    END LOOP;

    p_items_sold := jsonb_array_length(p_items);
END;
$procedure$;