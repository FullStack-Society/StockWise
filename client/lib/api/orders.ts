import "server-only";
import { apiRequest } from "./client";
import { ENDPOINTS } from "./endpoints";

export type PurchaseOrderItem = {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  quantityOrdered: number;
  unitPrice: number;
  quantityReceived: number;
  quantityRemaining: number;
};

export type PurchaseOrder = {
  id: number;
  orderNumber: number;
  notes: string | null;
  createdByEmail: string;
  createdAt: string;
  status: "Open" | "Partially received" | "Received";
  items: PurchaseOrderItem[];
};

export type PurchaseOrderHistoryEvent = {
  id: number;
  orderId: number;
  orderNumber: number;
  eventType: "created" | "updated" | "received" | "deleted";
  actorEmail: string;
  createdAt: string;
  details: Record<string, unknown>;
};

export type PurchaseOrderInput = {
  notes: string | null;
  items: Array<{
    product_id: number;
    quantity_ordered: number;
    unit_price: number;
  }>;
};

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Unexpected purchase order data format from the API.");
  return value as Record<string, unknown>;
}

function positiveInteger(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0)
    throw new Error("Unexpected purchase order data format from the API.");
  return parsed;
}

function nonNegativeInteger(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0)
    throw new Error("Unexpected purchase order data format from the API.");
  return parsed;
}

function nonNegativePrice(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0)
    throw new Error("Unexpected purchase order data format from the API.");
  return parsed;
}

function toPurchaseOrderItem(raw: unknown): PurchaseOrderItem {
  const value = record(raw);
  const quantityOrdered = positiveInteger(value.quantity_ordered);
  const quantityReceived = nonNegativeInteger(value.quantity_received);
  const quantityRemaining = nonNegativeInteger(value.quantity_remaining);
  if (
    quantityReceived > quantityOrdered ||
    quantityReceived + quantityRemaining !== quantityOrdered
  )
    throw new Error("Unexpected purchase order quantities from the API.");
  return {
    id: positiveInteger(value.item_id),
    productId: positiveInteger(value.product_id),
    productName: String(value.product_name ?? ""),
    sku: String(value.sku ?? ""),
    quantityOrdered,
    unitPrice: nonNegativePrice(value.unit_price),
    quantityReceived,
    quantityRemaining,
  };
}

function toPurchaseOrder(raw: unknown): PurchaseOrder {
  const value = record(raw);
  const status = value.status;
  if (
    status !== "Open" &&
    status !== "Partially received" &&
    status !== "Received"
  )
    throw new Error("Unexpected purchase order status from the API.");
  if (!Array.isArray(value.items))
    throw new Error("Unexpected purchase order items from the API.");
  return {
    id: positiveInteger(value.order_id),
    orderNumber: positiveInteger(value.order_number),
    notes: typeof value.notes === "string" ? value.notes : null,
    createdByEmail: String(value.created_by_email ?? ""),
    createdAt: String(value.created_at ?? ""),
    status,
    items: value.items.map(toPurchaseOrderItem),
  };
}

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const rows = await apiRequest<unknown>(ENDPOINTS.orders.root);
  if (!Array.isArray(rows))
    throw new Error("Unexpected purchase order list from the API.");
  return rows.map(toPurchaseOrder);
}

export async function listPurchaseOrderHistory(): Promise<
  PurchaseOrderHistoryEvent[]
> {
  const rows = await apiRequest<unknown>(ENDPOINTS.orders.history);
  if (!Array.isArray(rows))
    throw new Error("Unexpected purchase order history format from the API.");
  return rows.map((raw) => {
    const value = record(raw);
    const eventType = value.event_type;
    if (
      eventType !== "created" &&
      eventType !== "updated" &&
      eventType !== "received" &&
      eventType !== "deleted"
    ) {
      throw new Error("Unexpected purchase order history format from the API.");
    }
    const details = value.details;
    return {
      id: positiveInteger(value.event_id),
      orderId: positiveInteger(value.order_id),
      orderNumber: positiveInteger(value.order_number),
      eventType,
      actorEmail: String(value.actor_email ?? ""),
      createdAt: String(value.created_at ?? ""),
      details:
        typeof details === "object" &&
        details !== null &&
        !Array.isArray(details)
          ? (details as Record<string, unknown>)
          : {},
    };
  });
}

export async function createPurchaseOrder(
  input: PurchaseOrderInput,
): Promise<PurchaseOrder> {
  return toPurchaseOrder(
    await apiRequest<unknown>(ENDPOINTS.orders.root, {
      method: "POST",
      body: input,
    }),
  );
}

export async function updatePurchaseOrder(
  orderId: number,
  input: PurchaseOrderInput,
): Promise<PurchaseOrder> {
  return toPurchaseOrder(
    await apiRequest<unknown>(ENDPOINTS.orders.item(orderId), {
      method: "PUT",
      body: input,
    }),
  );
}

export async function deletePurchaseOrder(orderId: number): Promise<void> {
  await apiRequest<void>(ENDPOINTS.orders.delete(orderId), {
    method: "DELETE",
  });
}

export async function receivePurchaseOrderItem(
  orderId: number,
  itemId: number,
  quantity: number,
): Promise<PurchaseOrder> {
  return toPurchaseOrder(
    await apiRequest<unknown>(ENDPOINTS.orders.receive(orderId, itemId), {
      method: "POST",
      body: { quantity },
    }),
  );
}
