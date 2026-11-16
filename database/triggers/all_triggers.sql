-- 003_inventory_workflows.sql


DROP TRIGGER IF EXISTS trg_stockwise_create_default_location
    ON public.organizations;
CREATE TRIGGER trg_stockwise_create_default_location
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.stockwise_create_default_location();
-- 004_purchase_orders.sql


DROP TRIGGER IF EXISTS trg_stockwise_prevent_delete_open_order_product
    ON public.products;
CREATE TRIGGER trg_stockwise_prevent_delete_open_order_product
BEFORE UPDATE OF is_deleted ON public.products
FOR EACH ROW EXECUTE FUNCTION public.stockwise_prevent_delete_open_order_product();
-- 009_purchase_order_numbering_and_history.sql


CREATE TRIGGER trg_stockwise_assign_purchase_order_number
BEFORE INSERT ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.stockwise_assign_purchase_order_number();

CREATE CONSTRAINT TRIGGER trg_stockwise_purchase_order_created
AFTER INSERT ON public.purchase_orders
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.stockwise_purchase_order_history_trigger();

CREATE CONSTRAINT TRIGGER trg_stockwise_purchase_order_updated
AFTER UPDATE OF notes, deleted_at ON public.purchase_orders
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.stockwise_purchase_order_history_trigger();

CREATE TRIGGER trg_stockwise_purchase_order_item_received
AFTER UPDATE OF quantity_received ON public.purchase_order_items
FOR EACH ROW
WHEN (OLD.quantity_received IS DISTINCT FROM NEW.quantity_received)
EXECUTE FUNCTION public.stockwise_purchase_order_item_history_trigger();

CREATE TRIGGER trg_stockwise_guard_deleted_purchase_order_item
BEFORE INSERT OR UPDATE ON public.purchase_order_items
FOR EACH ROW EXECUTE FUNCTION public.stockwise_guard_deleted_purchase_order_item();
-- 025_remove_inventory_locations.sql


DROP TRIGGER IF EXISTS trg_stockwise_create_default_location
    ON public.organizations;
