-- Current purchase-order product guard.

CREATE OR REPLACE FUNCTION public.stockwise_prevent_delete_open_order_product()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF OLD.is_deleted = false
       AND NEW.is_deleted = true
       AND EXISTS (
           SELECT 1 FROM public.purchase_order_items AS item
           WHERE item.organization_id = OLD.organization_id
             AND item.product_id = OLD.product_id
             AND item.quantity_received < item.quantity_ordered
       ) THEN
        RAISE EXCEPTION
            'This product cannot be deleted while a purchase order has quantity remaining'
            USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
END;
$function$;
