"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "@/lib/api/inventory";
import { requireOrganizationSession } from "@/lib/auth/session";
import type { InventoryImportRow, ProductInput } from "./types";
import { ROUTES } from "@/app/routes";
import { parseProductForm } from "./validation";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type BulkDeleteResult = {
  deletedIds: number[];
  failures: Array<{ id: number; error: string }>;
};

export type InventoryImportResult = {
  imported: number;
  failures: Array<{ row: number; error: string }>;
};

function failure(error: unknown): ActionResult {
  if (error instanceof ApiError) {
    // Duplicate SKU: show it next to the SKU field.
    if (error.status === 409 && /sku/i.test(error.message)) {
      return {
        ok: false,
        error: error.message,
        fieldErrors: { sku: error.message },
      };
    }
    return { ok: false, error: error.message };
  }
  console.error("[StockWise] Unexpected error:", error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

/** Create (no id) or update (id present). Everything is validated again here on the server. */
export async function saveProduct(formData: FormData): Promise<ActionResult> {
  await requireOrganizationSession();

  const parsed = parseProductForm(formData);
  if (!parsed.ok) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.errors,
    };
  }

  try {
    if (parsed.id) await updateProduct(parsed.id, parsed.values);
    else await createProduct(parsed.values);
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }

  revalidatePath(ROUTES.inventory);
  revalidatePath(ROUTES.dashboard);
  return { ok: true };
}

export async function deleteProductAction(id: number): Promise<ActionResult> {
  await requireOrganizationSession();

  try {
    await deleteProduct(id);
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }

  revalidatePath(ROUTES.inventory);
  revalidatePath(ROUTES.dashboard);
  return { ok: true };
}

export async function deleteProductsAction(
  ids: number[],
): Promise<BulkDeleteResult> {
  await requireOrganizationSession();

  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.some((id) => !Number.isInteger(id) || id <= 0)
  ) {
    return {
      deletedIds: [],
      failures: [{ id: 0, error: "Select one or more valid products to delete." }],
    };
  }

  const productIds = [...new Set(ids)];
  const deletedIds: number[] = [];
  const failures: BulkDeleteResult["failures"] = [];
  let cursor = 0;

  async function deleteNext() {
    while (cursor < productIds.length) {
      const id = productIds[cursor++];
      try {
        await deleteProduct(id);
        deletedIds.push(id);
      } catch (error) {
        unstable_rethrow(error);
        const result = failure(error);
        failures.push({
          id,
          error: result.ok ? "Unable to delete this product." : result.error,
        });
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(5, productIds.length) },
      () => deleteNext(),
    ),
  );

  if (deletedIds.length > 0) {
    revalidatePath(ROUTES.inventory);
    revalidatePath(ROUTES.dashboard);
  }

  return { deletedIds, failures };
}

/** Imports validated CSV rows through the same organization-scoped create API as Add Product. */
export async function importProductsAction(
  rows: InventoryImportRow[],
): Promise<InventoryImportResult> {
  await requireOrganizationSession();
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 500) {
    return {
      imported: 0,
      failures: [{ row: 0, error: "Choose a CSV with between 1 and 500 valid product rows." }],
    };
  }

  const maxInt = 2_147_483_647;
  const failures: InventoryImportResult["failures"] = [];
  const validRows: InventoryImportRow[] = [];
  for (const entry of rows) {
    const value = entry?.product;
    const row = Number.isInteger(entry?.row) && entry.row > 0 ? entry.row : 0;
    const invalid =
      !value ||
      typeof value.name !== "string" || !value.name.trim() || value.name.length > 200 ||
      typeof value.sku !== "string" || !value.sku.trim() || value.sku.length > 100 ||
      (value.description !== null && typeof value.description !== "string") ||
      (typeof value.description === "string" && value.description.length > 1000) ||
      typeof value.price !== "number" || !Number.isFinite(value.price) || value.price < 0 ||
      !Number.isInteger(value.quantity) || value.quantity < 0 || value.quantity > maxInt ||
      (value.categoryId !== null && (!Number.isInteger(value.categoryId) || value.categoryId <= 0));
    if (invalid) {
      failures.push({ row, error: "This row contains invalid product values." });
    } else {
      validRows.push({
        row,
        product: {
          ...value,
          name: value.name.trim(),
          sku: value.sku.trim(),
          description: value.description?.trim() || null,
        },
      });
    }
  }

  let imported = 0;
  let cursor = 0;
  async function worker() {
    while (cursor < validRows.length) {
      const index = cursor++;
      const entry = validRows[index];
      try {
        await createProduct(entry.product);
        imported++;
      } catch (error) {
        failures.push({
          row: entry.row,
          error: error instanceof ApiError ? error.message : "Unable to import this product.",
        });
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(4, validRows.length) }, () => worker()),
  );

  if (imported > 0) {
    revalidatePath(ROUTES.inventory);
    revalidatePath(ROUTES.dashboard);
  }
  return { imported, failures: failures.sort((a, b) => a.row - b.row) };
}
