import "server-only";
import type {
  Category,
  InventoryLocation,
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
const toBody = (input: ProductInput, locationId: number) => ({
  product_name: input.name,
  sku: input.sku,
  category_id: input.categoryId,
  description: input.description,
  price: input.price,
  quantity: input.quantity,
  location_id: locationId,
  reorder_point: input.reorderPoint,
});

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Unexpected inventory data format from the API.");
  return value as Record<string, unknown>;
}

function toLocation(raw: unknown): InventoryLocation {
  const value = record(raw);
  const id = Number(value.location_id);
  if (!Number.isInteger(id) || id <= 0 || typeof value.location_name !== "string")
    throw new Error("Unexpected inventory location format from the API.");
  return {
    id,
    name: value.location_name,
    createdAt: String(value.created_at ?? ""),
  };
}

function toMovement(raw: unknown): InventoryMovement {
  const value = record(raw);
  const type = String(value.transaction_type);
  if (
    type !== "IN" &&
    type !== "OUT" &&
    type !== "STOCKTAKE" &&
    type !== "TRANSFER_IN" &&
    type !== "TRANSFER_OUT" &&
    type !== "OTHER"
  )
    throw new Error("Unexpected inventory movement type from the API.");
  return {
    id: Number(value.movement_id),
    occurredAt: String(value.occurred_at ?? ""),
    type,
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
async function listProductsAtLocation(locationId: number): Promise<Product[]> {
  const firstPage = await apiRequest<unknown>(ENDPOINTS.inventory.root, {
    query: { page_size: 100, location_id: locationId },
  });
  const products = toProductList(firstPage);

  const pages = Math.min(toPageCount(firstPage), 50);
  for (let page = 2; page <= pages; page++) {
    const next = await apiRequest<unknown>(ENDPOINTS.inventory.root, {
      query: { page_size: 100, page, location_id: locationId },
    });
    products.push(...toProductList(next));
  }
  return products;
}

export async function listInventoryLocations(): Promise<InventoryLocation[]> {
  const rows = await apiRequest<unknown[]>(ENDPOINTS.inventory.locations);
  if (!Array.isArray(rows))
    throw new Error("Unexpected inventory locations format from the API.");
  return rows.map(toLocation);
}

export async function createInventoryLocation(
  name: string,
): Promise<InventoryLocation> {
  return toLocation(
    await apiRequest<unknown>(ENDPOINTS.inventory.locations, {
      method: "POST",
      body: { location_name: name },
    }),
  );
}

export async function listProducts(locationId?: number): Promise<Product[]> {
  if (locationId) return listProductsAtLocation(locationId);
  const locations = await listInventoryLocations();
  const productsById = new Map<number, Product>();
  const lists = await Promise.all(
    locations.map((location) => listProductsAtLocation(location.id)),
  );
  for (const products of lists) {
    for (const product of products) {
      const current = productsById.get(product.id);
      if (current) {
        current.quantity += product.quantity;
        current.reorderPoint += product.reorderPoint;
        current.status =
          current.quantity <= 0
            ? "out-of-stock"
            : current.quantity <= current.reorderPoint
              ? "low-stock"
              : "in-stock";
        current.statusLabel =
          current.status === "out-of-stock"
            ? "Critical"
            : current.status === "low-stock"
              ? "Low stock"
              : "In stock";
      } else {
        productsById.set(product.id, {
          ...product,
          locationName: "All locations",
        });
      }
    }
  }
  return [...productsById.values()];
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

/** POST /api/inventory/ -> create_inventory() */
export async function createProduct(
  input: ProductInput,
  locationId: number,
): Promise<Product> {
  return toProduct(
    await apiRequest<unknown>(ENDPOINTS.inventory.root, {
      method: "POST",
      body: toBody(input, locationId),
    }),
  );
}

/** PUT /api/inventory/{id} -> update_inventory() (full update) */
export async function updateProduct(
  id: number,
  input: ProductInput,
  locationId: number,
): Promise<Product> {
  return toProduct(
    await apiRequest<unknown>(ENDPOINTS.inventory.item(id), {
      method: "PUT",
      body: toBody(input, locationId),
    }),
  );
}

/** DELETE /api/inventory/{id} -> delete_inventory() */
export async function deleteProduct(id: number): Promise<void> {
  await apiRequest<void>(ENDPOINTS.inventory.item(id), { method: "DELETE" });
}

export async function adjustProductStock(
  id: number,
  locationId: number,
  transactionType: "OUT" | "ADJUST",
  quantity: number,
  remarks: string,
): Promise<number> {
  const result = await apiRequest<{ quantity: number }>(
    ENDPOINTS.inventory.productMovements(id),
    {
      method: "POST",
      body: {
        location_id: locationId,
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
  locationId: number,
  countedQuantity: number,
  remarks: string,
): Promise<number> {
  const result = await apiRequest<{ quantity: number }>(
    ENDPOINTS.inventory.stocktake(id),
    {
      method: "POST",
      body: {
        location_id: locationId,
        counted_quantity: countedQuantity,
        remarks,
      },
    },
  );
  return result.quantity;
}

export async function transferProductStock(
  productId: number,
  sourceLocationId: number,
  destinationLocationId: number,
  quantity: number,
  remarks: string,
): Promise<void> {
  await apiRequest(ENDPOINTS.inventory.productTransfer(productId), {
    method: "POST",
    body: {
      source_location_id: sourceLocationId,
      destination_location_id: destinationLocationId,
      quantity,
      remarks,
    },
  });
}

export async function listInventoryMovements(
  locationId: number,
): Promise<InventoryMovement[]> {
  const rows = await apiRequest<unknown[]>(ENDPOINTS.inventory.movements, {
    query: { location_id: locationId, limit: 100 },
  });
  if (!Array.isArray(rows))
    throw new Error("Unexpected inventory history format from the API.");
  return rows.map(toMovement);
}
