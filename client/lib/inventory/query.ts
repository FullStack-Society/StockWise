import { PAGE_SIZE, STATUS_OPTIONS } from "./constants";
import type { Product } from "./types";

export type InventoryFilters = {
  query: string;
  category: string;
  status: string;
};
export type InventoryView = { filters: InventoryFilters; page: number };

type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

/** Reads ?search=&category=&status=&page= from the URL and throws away anything invalid. */
export function parseSearchParams(sp: SearchParams): InventoryView {
  const query = (first(sp.search) ?? "").trim().slice(0, 100);

  const categoryRaw = first(sp.category) ?? "";
  const category = /^\d+$/.test(categoryRaw) ? categoryRaw : "";

  const statusRaw = first(sp.status) ?? "";
  const status = STATUS_OPTIONS.some((o) => o.value === statusRaw)
    ? statusRaw
    : "";

  const page = Number.parseInt(first(sp.page) ?? "1", 10);
  return {
    filters: { query, category, status },
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/**
 * Filters and paginates the full product list.
 * The API returns every product, so this runs in Next.js. If the catalog grows very large,
 * move this to the API (get_inventory already supports search / category / status).
 */
export function applyView(products: Product[], view: InventoryView) {
  const q = view.filters.query.toLowerCase();
  const { category, status } = view.filters;

  const filtered = products.filter(
    (p) =>
      (!q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)) &&
      (!category || String(p.categoryId) === category) &&
      (!status || p.status === status),
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(view.page, pageCount);
  const start = (page - 1) * PAGE_SIZE;

  return {
    rows: filtered.slice(start, start + PAGE_SIZE),
    total: filtered.length,
    page,
    pageCount,
    start,
  };
}
