import type { Category, Product, StockStatus } from "./types";

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
  "out-of-stock": "Critical",
};

/** Uses the fixed stock alert thresholds. */
function toStatus(quantity: number): StockStatus {
  if (quantity <= 25) return "out-of-stock";
  return quantity <= 50 ? "low-stock" : "in-stock";
}

export function toProduct(raw: unknown): Product {
  if (!isRecord(raw))
    throw new Error("Unexpected product format from the API.");
  const quantity = toNumber(raw.quantity);
  const status = toStatus(quantity);

  return {
    id: toNumber(raw.product_id),
    name: toText(raw.product_name) ?? "",
    sku: toText(raw.sku) ?? "",
    categoryId: raw.category_id == null ? null : toNumber(raw.category_id),
    categoryName: toText(raw.category_name),
    description: toText(raw.description),
    price: toNumber(raw.price), // the API may send "100.00" (string) or 100 (number)
    quantity,
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
