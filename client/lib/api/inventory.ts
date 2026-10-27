import "server-only";
import type { Category, Product, ProductInput } from "@/lib/inventory/types";
import { ApiError, apiRequest } from "./client";
import { ENDPOINTS } from "./endpoints";
import {
  toCategoryList,
  toPageCount,
  toProduct,
  toProductList,
} from "./normalize";

/** UI fields -> the column names the PostgreSQL routines use. */
const toBody = (input: ProductInput) => ({
  product_name: input.name,
  sku: input.sku,
  category_id: input.categoryId,
  description: input.description,
  price: input.price,
  quantity: input.quantity,
  minimum_stock: input.minimumStock,
});

/**
 * GET /api/inventory/  -> get_inventory()
 * Returns EVERY product. A plain-list API sends them all at once; if the API paginates
 * ({ items, pages }), the remaining pages are fetched here (up to 50 pages of 100).
 */
export async function listProducts(): Promise<Product[]> {
  const firstPage = await apiRequest<unknown>(ENDPOINTS.inventory, {
    query: { page_size: 100 },
  });
  const products = toProductList(firstPage);

  const pages = Math.min(toPageCount(firstPage), 50);
  for (let page = 2; page <= pages; page++) {
    const next = await apiRequest<unknown>(ENDPOINTS.inventory, {
      query: { page_size: 100, page },
    });
    products.push(...toProductList(next));
  }
  return products;
}

/** GET categories -> get_categories(). Tries each known URL; an empty list never breaks the page. */
export async function listCategories(): Promise<Category[]> {
  for (const path of ENDPOINTS.categories) {
    try {
      return toCategoryList(await apiRequest<unknown>(path));
    } catch (error) {
      const missing =
        error instanceof ApiError && [404, 405, 422].includes(error.status);
      if (!missing) throw error;
    }
  }
  console.warn(
    "[StockWise] No categories endpoint found. Check ENDPOINTS.categories in lib/api/endpoints.ts",
  );
  return [];
}

/** POST /api/inventory/ -> create_inventory() */
export async function createProduct(input: ProductInput): Promise<Product> {
  return toProduct(
    await apiRequest<unknown>(ENDPOINTS.inventory, {
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
    await apiRequest<unknown>(ENDPOINTS.inventoryItem(id), {
      method: "PUT",
      body: toBody(input),
    }),
  );
}

/** DELETE /api/inventory/{id} -> delete_inventory() */
export async function deleteProduct(id: number): Promise<void> {
  await apiRequest<void>(ENDPOINTS.inventoryItem(id), { method: "DELETE" });
}
