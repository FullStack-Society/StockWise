

CREATE OR REPLACE FUNCTION public.stockwise_get_inventory_product_details(
    p_organization_id integer,
    p_product_ids integer[]
)
RETURNS TABLE(product_id integer, variant text, upc text)
LANGUAGE sql
STABLE
AS $function$
    SELECT product.product_id, product.variant::text, product.upc::text
    FROM public.products AS product
    WHERE product.organization_id = p_organization_id
      AND product.product_id = ANY(p_product_ids);
$function$;