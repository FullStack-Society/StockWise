"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  adjustProductStock,
  createCategory,
  createInventoryLocation,
  createProduct,
  deleteCategory,
  deleteProduct,
  listStockAlerts,
  recordProductStocktake,
  transferProductStock,
  updateProduct,
} from "@/lib/api/inventory";
import { requireOrganizationSession } from "@/lib/auth/session";
import { getOrganizationPageContext } from "@/lib/organization/page-context";
import type { InventoryImportRow, ProductInput } from "./types";
import { ROUTES } from "@/lib/routes";
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

export async function getStockAlertSnapshot() {
  const session = await requireOrganizationSession();
  const products = await listStockAlerts();
  return {
    organizationId: session.organizationId!,
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      quantity: product.quantity,
      reorderPoint: product.reorderPoint,
      locationId: product.locationId,
      locationName: product.locationName,
      status: product.status,
    })),
  };
}

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
    if (parsed.id)
      await updateProduct(parsed.id, parsed.values, parsed.locationId);
    else await createProduct(parsed.values, parsed.locationId);
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
      failures: [
        { id: 0, error: "Select one or more valid products to delete." },
      ],
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
    Array.from({ length: Math.min(5, productIds.length) }, () => deleteNext()),
  );

  if (deletedIds.length > 0) {
    revalidatePath(ROUTES.inventory);
    revalidatePath(ROUTES.dashboard);
  }

  return { deletedIds, failures };
}

export async function importProductsAction(
  rows: InventoryImportRow[],
  locationId: number,
): Promise<InventoryImportResult> {
  await requireOrganizationSession();
  if (
    !Number.isInteger(locationId) ||
    locationId <= 0 ||
    !Array.isArray(rows) ||
    rows.length === 0 ||
    rows.length > 500
  ) {
    return {
      imported: 0,
      failures: [
        {
          row: 0,
          error: "Choose a CSV with between 1 and 500 valid product rows.",
        },
      ],
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
      typeof value.name !== "string" ||
      !value.name.trim() ||
      value.name.length > 200 ||
      typeof value.sku !== "string" ||
      !value.sku.trim() ||
      value.sku.length > 100 ||
      (value.description !== null && typeof value.description !== "string") ||
      (typeof value.description === "string" &&
        value.description.length > 1000) ||
      typeof value.price !== "number" ||
      !Number.isFinite(value.price) ||
      value.price < 0 ||
      typeof value.unitCost !== "number" ||
      !Number.isFinite(value.unitCost) ||
      value.unitCost < 0 ||
      !Number.isInteger(value.quantity) ||
      value.quantity < 0 ||
      value.quantity > maxInt ||
      !Number.isInteger(value.reorderPoint) ||
      value.reorderPoint < 0 ||
      value.reorderPoint > maxInt ||
      (value.categoryId !== null &&
        (!Number.isInteger(value.categoryId) || value.categoryId <= 0));
    if (invalid) {
      failures.push({
        row,
        error: "This row contains invalid product values.",
      });
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
        await createProduct(entry.product, locationId);
        imported++;
      } catch (error) {
        failures.push({
          row: entry.row,
          error:
            error instanceof ApiError
              ? error.message
              : "Unable to import this product.",
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

export async function adjustProductStockAction(
  productId: number,
  locationId: number,
  transactionType: "OUT" | "ADJUST",
  quantity: number,
  remarks: string,
): Promise<ActionResult> {
  await requireOrganizationSession();
  if (
    !Number.isInteger(productId) ||
    productId <= 0 ||
    !Number.isInteger(locationId) ||
    locationId <= 0 ||
    !Number.isInteger(quantity) ||
    quantity === 0 ||
    Math.abs(quantity) > 2_147_483_647 ||
    (transactionType === "OUT" && quantity < 0) ||
    !["OUT", "ADJUST"].includes(transactionType) ||
    !remarks.trim() ||
    remarks.trim().length > 500
  ) {
    return { ok: false, error: "Enter a valid stock movement and reason." };
  }
  try {
    await adjustProductStock(
      productId,
      locationId,
      transactionType,
      quantity,
      remarks.trim(),
    );
    revalidatePath(ROUTES.inventory);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.reports);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function recordProductStocktakeAction(
  productId: number,
  locationId: number,
  countedQuantity: number,
  remarks: string,
): Promise<ActionResult> {
  await requireOrganizationSession();
  if (
    !Number.isInteger(productId) ||
    productId <= 0 ||
    !Number.isInteger(locationId) ||
    locationId <= 0 ||
    !Number.isInteger(countedQuantity) ||
    countedQuantity < 0 ||
    !remarks.trim() ||
    remarks.trim().length > 500
  ) {
    return { ok: false, error: "Enter a valid stock count and note." };
  }
  try {
    await recordProductStocktake(
      productId,
      locationId,
      countedQuantity,
      remarks.trim(),
    );
    revalidatePath(ROUTES.inventory);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.reports);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function transferProductStockAction(
  productId: number,
  sourceLocationId: number,
  destinationLocationId: number,
  quantity: number,
  remarks: string,
): Promise<ActionResult> {
  await requireOrganizationSession();
  if (
    !Number.isInteger(productId) ||
    productId <= 0 ||
    !Number.isInteger(sourceLocationId) ||
    sourceLocationId <= 0 ||
    !Number.isInteger(destinationLocationId) ||
    destinationLocationId <= 0 ||
    sourceLocationId === destinationLocationId ||
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    quantity > 2_147_483_647 ||
    !remarks.trim() ||
    remarks.trim().length > 500
  ) {
    return { ok: false, error: "Enter a valid transfer and reason." };
  }
  try {
    await transferProductStock(
      productId,
      sourceLocationId,
      destinationLocationId,
      quantity,
      remarks.trim(),
    );
    revalidatePath(ROUTES.inventory);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.reports);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function createInventoryLocationAction(
  locationName: string,
): Promise<ActionResult> {
  const { organization } = await getOrganizationPageContext();
  if (!organization) {
    return { ok: false, error: "Choose an organization first." };
  }
  if (organization.role !== "owner" && organization.role !== "manager") {
    return { ok: false, error: "Only owners and managers can add locations." };
  }
  const name = locationName.trim();
  if (!name || name.length > 120) {
    return {
      ok: false,
      error: "Enter a location name of up to 120 characters.",
    };
  }
  try {
    await createInventoryLocation(name);
    revalidatePath(ROUTES.inventory);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function createInventoryCategoryAction(
  categoryName: string,
): Promise<ActionResult> {
  const { organization } = await getOrganizationPageContext();
  if (!organization) {
    return { ok: false, error: "Choose an organization first." };
  }
  const name = categoryName.trim();
  if (!name || name.length > 100) {
    return {
      ok: false,
      error: "Enter a category name between 1 and 100 characters.",
    };
  }
  try {
    await createCategory(name);
    revalidatePath(ROUTES.inventory);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.reports);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function deleteInventoryCategoryAction(
  categoryId: number,
): Promise<ActionResult> {
  const { organization } = await getOrganizationPageContext();
  if (!organization) {
    return { ok: false, error: "Choose an organization first." };
  }
  if (organization.role !== "owner" && organization.role !== "manager") {
    return { ok: false, error: "Only owners and managers can manage categories." };
  }
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { ok: false, error: "Choose a valid category." };
  }
  try {
    await deleteCategory(categoryId);
    revalidatePath(ROUTES.inventory);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.reports);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}
