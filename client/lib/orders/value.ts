import type { PurchaseOrder } from "@/lib/api/orders";

/** Total value of purchase orders using their ordered quantities and unit prices. */
export function getPurchaseOrderValue(orders: readonly PurchaseOrder[]): number {
  return orders.reduce(
    (total, order) =>
      total +
      order.items.reduce(
        (orderTotal, item) =>
          orderTotal + item.quantityOrdered * item.unitPrice,
        0,
      ),
    0,
  );
}
