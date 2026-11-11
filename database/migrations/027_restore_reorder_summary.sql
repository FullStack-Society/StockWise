BEGIN;

-- Reports still consume these totals; calculate them from the single
-- organization-level product balance after inventory locations are removed.
CREATE OR REPLACE FUNCTION public.stockwise_get_reorder_summary(
    p_organization_id integer
)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $function$
    SELECT jsonb_build_object(
        'low_stock_count', COUNT(*) FILTER (
            WHERE p.quantity > 0 AND p.quantity <= p.reorder_point
        ),
        'critical_count', COUNT(*) FILTER (WHERE p.quantity <= 0)
    )
    FROM public.products AS p
    WHERE p.organization_id = p_organization_id
      AND p.is_deleted = false;
$function$;

INSERT INTO public.schema_migrations (version, name)
VALUES ('027', 'Restore reorder summary for single stock balances')
ON CONFLICT (version) DO NOTHING;

COMMIT;
