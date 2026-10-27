import type { Category, Product, StockStatus } from "@/lib/inventory/types";

type Raw = Record<string, unknown>;

const isRecord = (v: unknown): v is Raw =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const toText = (value: unknown): string | null =>
  typeof value === "string" ? value : value == null ? null : String(value);

const STATUS_LABEL: Record<StockStatus, string> = {
  "in-stock": "In stock",
  "low-stock": "Low stock",
  "out-of-stock": "Out of stock",
};

/** Accepts "In stock" or "in-stock". Falls back to the same rule the database uses. */
function toStatus(
  raw: unknown,
  quantity: number,
  minimum: number,
): StockStatus {
  const key =
    typeof raw === "string"
      ? raw.trim().toLowerCase().replace(/\s+/g, "-")
      : "";
  if (key === "in-stock" || key === "low-stock" || key === "out-of-stock")
    return key;
  if (quantity <= 0) return "out-of-stock";
  return quantity <= minimum ? "low-stock" : "in-stock";
}

export function toProduct(raw: unknown): Product {
  if (!isRecord(raw))
    throw new Error("Unexpected product format from the API.");
  const quantity = toNumber(raw.quantity);
  const minimumStock = toNumber(raw.minimum_stock);
  const status = toStatus(raw.status, quantity, minimumStock);

  return {
    id: toNumber(raw.product_id),
    name: toText(raw.product_name) ?? "",
    sku: toText(raw.sku) ?? "",
    categoryId: raw.category_id == null ? null : toNumber(raw.category_id),
    categoryName: toText(raw.category_name),
    description: toText(raw.description),
    price: toNumber(raw.price), // the API may send "100.00" (string) or 100 (number)
    quantity,
    minimumStock,
    status,
    statusLabel: STATUS_LABEL[status],
    createdAt: toText(raw.created_at) ?? "",
    updatedAt: toText(raw.updated_at) ?? "",
  };
}

/** The list endpoint may return a plain array or { items: [...] }. Both work. */
export function toProductList(payload: unknown): Product[] {
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.items)
      ? payload.items
      : null;
  if (!rows) throw new Error("Unexpected inventory list format from the API.");
  return rows.map(toProduct);
}

/** If the list endpoint wraps results as { items, pages }, returns the page count; a plain array is 1 page. */
export function toPageCount(payload: unknown): number {
  if (
    isRecord(payload) &&
    typeof payload.pages === "number" &&
    payload.pages > 1
  )
    return Math.floor(payload.pages);
  return 1;
}

export function toCategoryList(payload: unknown): Category[] {
  if (!Array.isArray(payload))
    throw new Error("Unexpected category list format from the API.");
  return payload.filter(isRecord).map((r) => ({
    id: toNumber(r.category_id),
    name: toText(r.category_name) ?? "",
  }));
}
