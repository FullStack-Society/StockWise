import "server-only";
import type {
  Category,
  InventoryMovement,
  Product,
  ProductInput,
} from "@/lib/inventory/types";
import {
  toCategoryList,
  toPageCount,
  toProduct,
  toProductList,
} from "@/lib/inventory/normalize";
import { ApiError, apiRequest } from "./client";
import { ENDPOINTS } from "./endpoints";

/** UI fields -> the column names the PostgreSQL routines use. */
const toBody = (input: ProductInput) => ({
  product_name: input.name,
  sku: input.sku,
  upc: input.upc,
  category_id: input.categoryId,
  description: input.description,
  price: input.price,
  variant: input.variant,
  quantity: input.quantity,
  reorder_point: input.reorderPoint,
});

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Unexpected inventory data format from the API.");
  return value as Record<string, unknown>;
}

function toMovement(raw: unknown): InventoryMovement {
  const value = record(raw);
  const type = String(value.transaction_type);
  const recognized =
    type === "IN" ||
    type === "OUT" ||
    type === "STOCKTAKE" ||
    type === "OTHER";
  return {
    id: Number(value.movement_id),
    occurredAt: String(value.occurred_at ?? ""),
    type: recognized ? type : "OTHER",
    productId: Number(value.product_id),
    productName: String(value.product_name ?? ""),
    sku: String(value.sku ?? ""),
    quantity: Number(value.quantity ?? 0),
    expectedQuantity:
      value.expected_quantity == null ? null : Number(value.expected_quantity),
    countedQuantity:
      value.counted_quantity == null ? null : Number(value.counted_quantity),
    actorEmail: String(value.actor_email ?? "Unknown"),
    remarks: typeof value.remarks === "string" ? value.remarks : null,
  };
}

/**
 * GET /api/inventory/  -> get_inventory()
 * Returns EVERY product. A plain-list API sends them all at once; if the API paginates
 * ({ items, pages }), the remaining pages are fetched here (up to 50 pages of 100).
 */
export async function listProducts(): Promise<Product[]> {
  const firstPage = await apiRequest<unknown>(ENDPOINTS.inventory.root, {
    query: { page_size: 100 },
  });
  const products = toProductList(firstPage);

  const pages = Math.min(toPageCount(firstPage), 50);
  for (let page = 2; page <= pages; page++) {
    const next = await apiRequest<unknown>(ENDPOINTS.inventory.root, {
      query: { page_size: 100, page },
    });
    products.push(...toProductList(next));
  }
  return products;
}

export async function listStockAlerts(): Promise<Product[]> {
  return toProductList(await apiRequest<unknown>(ENDPOINTS.inventory.alerts));
}

/** GET categories -> get_categories(). Tries each known URL; an empty list never breaks the page. */
export async function listCategories(): Promise<Category[]> {
  for (const path of ENDPOINTS.inventory.categories) {
    try {
      return toCategoryList(await apiRequest<unknown>(path));
    } catch (error) {
      const missing =
        error instanceof ApiError && [404, 405, 422].includes(error.status);
      if (!missing) throw error;
    }
  }
  console.warn(
    "[StockWise] No categories endpoint found. Check ENDPOINTS.inventory.categories in lib/api/endpoints.ts",
  );
  return [];
}

export function createCategory(categoryName: string) {
  return apiRequest<{
    category_id: number;
    category_name: string;
    description: string | null;
  }>(ENDPOINTS.inventory.categories[0], {
    method: "POST",
    body: { category_name: categoryName },
  });
}

export function deleteCategory(categoryId: number) {
  return apiRequest<void>(ENDPOINTS.inventory.category(categoryId), {
    method: "DELETE",
  });
}

/** POST /api/inventory/ -> create_inventory() */
export async function createProduct(
  input: ProductInput,
): Promise<Product> {
  return toProduct(
    await apiRequest<unknown>(ENDPOINTS.inventory.root, {
      method: "POST",
      body: toBody(input),
    }),
  );
}

/** PUT /api/inventory/{id} -> update_inventory() (full update) */
export async function updateProduct(
  id: number,
  input: ProductInput,
): Promise<Product> {
  return toProduct(
    await apiRequest<unknown>(ENDPOINTS.inventory.item(id), {
      method: "PUT",
      body: toBody(input),
    }),
  );
}

/** DELETE /api/inventory/{id} -> delete_inventory() */
export async function deleteProduct(id: number): Promise<void> {
  await apiRequest<void>(ENDPOINTS.inventory.item(id), { method: "DELETE" });
}

export async function adjustProductStock(
  id: number,
  transactionType: "OUT" | "ADJUST",
  quantity: number,
  remarks: string,
): Promise<number> {
  const result = await apiRequest<{ quantity: number }>(
    ENDPOINTS.inventory.productMovements(id),
    {
      method: "POST",
      body: {
        transaction_type: transactionType,
        quantity,
        remarks,
      },
    },
  );
  return result.quantity;
}

export async function recordProductStocktake(
  id: number,
  countedQuantity: number,
  remarks: string,
): Promise<number> {
  const result = await apiRequest<{ quantity: number }>(
    ENDPOINTS.inventory.stocktake(id),
    {
      method: "POST",
      body: {
        counted_quantity: countedQuantity,
        remarks,
      },
    },
  );
  return result.quantity;
}

export async function listInventoryMovements(): Promise<InventoryMovement[]> {
  const rows = await apiRequest<unknown[]>(ENDPOINTS.inventory.movements, {
    query: { limit: 200 },
  });
  if (!Array.isArray(rows))
    throw new Error("Unexpected inventory history format from the API.");
  return rows.map(toMovement);
}
