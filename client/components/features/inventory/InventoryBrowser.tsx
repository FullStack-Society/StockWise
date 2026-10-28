"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { deleteProductAction } from "@/lib/inventory/actions";
import { exportProductsCsv } from "@/lib/inventory/csv-export";
import type { InventoryFilters } from "@/lib/inventory/query";
import type { Category, Product } from "@/lib/inventory/types";
import FilterBar from "./FilterBar";
import InventoryHeader from "./InventoryHeader";
import InventoryTable from "./InventoryTable";
import Pagination from "./Pagination";
import ProductModal from "@/components/modals/inventory/ProductModal";
import ImportModal from "@/components/modals/inventory/ImportModal";
import styles from "@/styles/inventory/InventoryBrowser.module.css";
import extra from "@/styles/inventory/InventoryActions.module.css";

type Props = {
  rows: Product[];
  total: number;
  page: number;
  pageCount: number;
  start: number;
  exportProducts: Product[];
  categories: Category[];
  filters: InventoryFilters;
};

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; product: Product }
  | null;
type Patch = Partial<{
  search: string;
  category: string;
  status: string;
  page: number;
}>;

export default function InventoryBrowser({
  rows,
  total,
  page,
  pageCount,
  start,
  exportProducts,
  categories,
  filters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(filters.query);
  const [previousUrlQuery, setPreviousUrlQuery] = useState(filters.query);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);
  const [showImport, setShowImport] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function downloadInventory() {
    const blob = new Blob(["\uFEFF", exportProductsCsv(exportProducts)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "stockwise-inventory.csv";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const { query: urlQuery, category, status } = filters;

  if (urlQuery !== previousUrlQuery) {
    setPreviousUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  const navigate = useCallback(
    (patch: Patch) => {
      const next = { search: urlQuery, category, status, page: 1, ...patch }; // page resets to 1 unless given
      const qs = new URLSearchParams();
      if (next.search) qs.set("search", next.search);
      if (next.category) qs.set("category", next.category);
      if (next.status) qs.set("status", next.status);
      if (next.page > 1) qs.set("page", String(next.page));
      const url = qs.toString() ? `${pathname}?${qs}` : pathname;
      startTransition(() => router.replace(url, { scroll: false }));
    },
    [urlQuery, category, status, pathname, router],
  );

  // Wait until the user stops typing, then put the search in the URL.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === urlQuery) return;
    const timer = setTimeout(() => navigate({ search: trimmed }), 350);
    return () => clearTimeout(timer);
  }, [query, urlQuery, navigate]);

  function clearFilters() {
    setQuery("");
    navigate({ search: "", category: "", status: "" });
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = rows.every((r) => next.has(r.id));
      rows.forEach((r) => (allOn ? next.delete(r.id) : next.add(r.id)));
      return next;
    });
  }

  function handleDelete(product: Product) {
    if (
      !window.confirm(
        `Mark "${product.name}" as deleted? It will be hidden from active inventory.`,
      )
    )
      return;
    setActionError(null);
    startTransition(async () => {
      const result = await deleteProductAction(product.id);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    });
  }

  const hasFilters = Boolean(urlQuery || category || status);
  const emptyMessage = hasFilters
    ? "No products match your filters."
    : "No products yet. Click Add Product to create the first one.";

  return (
    <>
      <InventoryHeader
        onAdd={() => setModal({ mode: "create" })}
        onImport={() => setShowImport(true)}
        onExport={downloadInventory}
        canExport={exportProducts.length > 0}
      />

      {actionError && (
        <div role="alert" className={extra.banner}>
          <span>{actionError}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setActionError(null)}
            className={extra.bannerClose}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <FilterBar
        query={query}
        category={category}
        status={status}
        categories={categories}
        onQueryChange={setQuery}
        onCategoryChange={(value) => navigate({ category: value })}
        onStatusChange={(value) => navigate({ status: value })}
        onClear={clearFilters}
      />

      <section
        className={styles.tablePanel}
        style={{ opacity: isPending ? 0.6 : 1, transition: "opacity 0.15s" }}
      >
        <InventoryTable
          rows={rows}
          selected={selected}
          emptyMessage={emptyMessage}
          onToggle={toggleOne}
          onToggleAll={toggleAll}
          onEdit={(product) => setModal({ mode: "edit", product })}
          onDelete={handleDelete}
        />

        <div className={styles.footer}>
          <span>
            {total === 0
              ? "No items"
              : `Showing ${start + 1}-${start + rows.length} of ${total} items`}
          </span>
          {pageCount > 1 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              onChange={(n) => navigate({ page: n })}
            />
          )}
        </div>
      </section>

      {modal && (
        <ProductModal
          key={modal.mode === "edit" ? modal.product.id : "new"}
          product={modal.mode === "edit" ? modal.product : null}
          categories={categories}
          onClose={() => setModal(null)}
        />
      )}
      {showImport && (
        <ImportModal
          categories={categories}
          onClose={() => setShowImport(false)}
          onImported={() => router.refresh()}
        />
      )}
    </>
  );
}
