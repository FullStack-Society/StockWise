"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  createPurchaseOrder,
  deletePurchaseOrder,
  receivePurchaseOrderItem,
  updatePurchaseOrder,
} from "@/lib/api/orders";
import { requireOrganizationSession } from "@/lib/auth/session";
import { ROUTES } from "@/lib/routes";

export type PurchaseOrderActionResult =
  | { ok: true }
  | { ok: false; error: string };

type PurchaseOrderItemInput = {
  productId: number;
  quantity: number;
  unitPrice: number;
};

type ValidatedPurchaseOrderDetails =
  | { ok: true; notes: string | null; items: PurchaseOrderItemInput[] }
  | { ok: false; error: string };

function validatePurchaseOrderDetails(
  items: unknown,
  notes: unknown,
): ValidatedPurchaseOrderDetails {
  if (typeof notes !== "string" || !Array.isArray(items)) {
    return { ok: false, error: "Enter valid purchase order details." };
  }

  const normalizedNotes = notes.trim();
  const validItems = items.every(
    (item): item is PurchaseOrderItemInput =>
      !!item &&
      typeof item === "object" &&
      Number.isInteger(item.productId) &&
      item.productId > 0 &&
      item.productId <= 2_147_483_647 &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0 &&
      item.quantity <= 2_147_483_647 &&
      Number.isFinite(item.unitPrice) &&
      item.unitPrice >= 0 &&
      item.unitPrice <= 999_999_999_999.99 &&
      Math.round(item.unitPrice * 100) / 100 === item.unitPrice,
  );

  if (
    items.length < 1 ||
    items.length > 100 ||
    !validItems ||
    new Set(items.map((item) => item.productId)).size !== items.length ||
    normalizedNotes.length > 1000
  ) {
    return {
      ok: false,
      error:
        "Enter unique products, valid quantities and unit values, and notes under 1,000 characters.",
    };
  }

  return { ok: true, notes: normalizedNotes || null, items };
}

function failure(error: unknown): PurchaseOrderActionResult {
  if (error instanceof ApiError)
    return { ok: false, error: error.message };
  console.error("[StockWise] Unexpected purchase order error:", error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function createPurchaseOrderAction(
  items: Array<{ productId: number; quantity: number; unitPrice: number }>,
  notes: string,
): Promise<PurchaseOrderActionResult> {
  await requireOrganizationSession();
  const validated = validatePurchaseOrderDetails(items, notes);
  if (!validated.ok) return validated;

  try {
    await createPurchaseOrder({
      notes: validated.notes,
      items: validated.items.map((item) => ({
        product_id: item.productId,
        quantity_ordered: item.quantity,
        unit_price: item.unitPrice,
      })),
    });
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
  revalidatePath(ROUTES.orders);
  revalidatePath(ROUTES.dashboard);
  return { ok: true };
}

export async function updatePurchaseOrderAction(
  orderId: number,
  items: Array<{ productId: number; quantity: number; unitPrice: number }>,
  notes: string,
): Promise<PurchaseOrderActionResult> {
  await requireOrganizationSession();
  if (
    !Number.isInteger(orderId) ||
    orderId <= 0
  ) {
    return { ok: false, error: "Enter valid purchase order details." };
  }
  const validated = validatePurchaseOrderDetails(items, notes);
  if (!validated.ok) return validated;

  try {
    await updatePurchaseOrder(orderId, {
      notes: validated.notes,
      items: validated.items.map((item) => ({
        product_id: item.productId,
        quantity_ordered: item.quantity,
        unit_price: item.unitPrice,
      })),
    });
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
  revalidatePath(ROUTES.orders);
  revalidatePath(ROUTES.dashboard);
  return { ok: true };
}

export async function deletePurchaseOrderAction(
  orderId: number,
): Promise<PurchaseOrderActionResult> {
  await requireOrganizationSession();
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return { ok: false, error: "Enter a valid purchase order." };
  }

  try {
    await deletePurchaseOrder(orderId);
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
  revalidatePath(ROUTES.orders);
  revalidatePath(ROUTES.dashboard);
  return { ok: true };
}

export async function receivePurchaseOrderItemAction(
  orderId: number,
  itemId: number,
  quantity: number,
): Promise<PurchaseOrderActionResult> {
  await requireOrganizationSession();
  if (
    !Number.isInteger(orderId) ||
    orderId <= 0 ||
    !Number.isInteger(itemId) ||
    itemId <= 0 ||
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    quantity > 2_147_483_647
  ) {
    return { ok: false, error: "Enter a valid receipt quantity." };
  }

  try {
    await receivePurchaseOrderItem(orderId, itemId, quantity);
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
  revalidatePath(ROUTES.orders);
  revalidatePath(ROUTES.inventory);
  revalidatePath(ROUTES.dashboard);
  revalidatePath(ROUTES.reports);
  return { ok: true };
}
