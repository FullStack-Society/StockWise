"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { exportProductsCsv } from "@/lib/inventory/csv-export";
import type { InventoryFilters } from "@/lib/inventory/query";
import type {
  Category,
  InventoryMovement,
  Product,
} from "@/lib/inventory/types";
import FilterBar from "./FilterBar";
import InventoryHeader from "./InventoryHeader";
import InventoryTable from "./InventoryTable";
import Pagination from "@/components/ui/Pagination";
import InventoryHistoryModal from "./modals/InventoryHistoryModal";
import StockWorkflowModal, {
  type StockMode,
} from "./modals/StockWorkflowModal";
import { useInventorySelection } from "./useInventorySelection";
import ProductModal from "@/components/features/inventory/modals/ProductModal";
import ImportModal from "@/components/features/inventory/modals/ImportModal";
import CategoryManagementModal from "@/components/features/inventory/modals/CategoryManagementModal";
import DeleteProductConfirmationModal from "@/components/features/inventory/modals/DeleteProductConfirmationModal";
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
  defaultReorderPoint: number;
  history: InventoryMovement[];
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
  defaultReorderPoint,
  history,
  filters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.query);
  const [previousUrlQuery, setPreviousUrlQuery] = useState(filters.query);
  const [modal, setModal] = useState<ModalState>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [stockWorkflow, setStockWorkflow] = useState<{
    product: Product;
    mode: StockMode;
  } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const {
    selected,
    error: actionError,
    isPending: isDeleting,
    deleteConfirmation,
    clearError,
    cancelDelete,
    toggleOne,
    toggleAll,
    requestDeleteSelected,
    requestDeleteProduct,
    confirmDelete,
  } = useInventorySelection();
  const isPending = isNavigating || isDeleting;
  const productIds = exportProducts.map((product) => product.id);

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

  const {
    query: urlQuery,
    category,
    status,
  } = filters;

  if (urlQuery !== previousUrlQuery) {
    setPreviousUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  const navigate = useCallback(
    (patch: Patch) => {
      const next = {
        search: urlQuery,
        category,
        status,
        page: 1,
        ...patch,
      };
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
        onHistory={() => setShowHistory(true)}
        onCategories={() => setShowCategories(true)}
      />

      {selected.size > 0 && (
        <div className={styles.selectionActions}>
          <span>
            {selected.size} {selected.size === 1 ? "product" : "products"}{" "}
            selected
          </span>
          <button
            type="button"
            className={styles.deleteSelected}
            onClick={requestDeleteSelected}
            disabled={isPending}
          >
            <Trash2 size={14} />
            Delete selected
          </button>
        </div>
      )}

      {actionError && (
        <div role="alert" className={extra.banner}>
          <span>{actionError}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={clearError}
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
          allProductIds={productIds}
          emptyMessage={emptyMessage}
          onToggle={toggleOne}
          onToggleAll={() => toggleAll(productIds)}
          onEdit={(product) => setModal({ mode: "edit", product })}
          onDelete={requestDeleteProduct}
          onMovement={(product, mode) => setStockWorkflow({ product, mode })}
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
          defaultReorderPoint={defaultReorderPoint}
          onClose={() => setModal(null)}
        />
      )}
      {showImport && (
        <ImportModal
          categories={categories}
          defaultReorderPoint={defaultReorderPoint}
          onClose={() => setShowImport(false)}
          onImported={() => router.refresh()}
        />
      )}
      {stockWorkflow && (
        <StockWorkflowModal
          product={stockWorkflow.product}
          mode={stockWorkflow.mode}
          onClose={() => setStockWorkflow(null)}
          onSuccess={() => router.refresh()}
        />
      )}
      {showHistory && (
        <InventoryHistoryModal
          movements={history}
          onClose={() => setShowHistory(false)}
        />
      )}
      {showCategories && (
        <CategoryManagementModal
          categories={categories}
          onClose={() => setShowCategories(false)}
          onSuccess={(deletedCategoryId) => {
            setShowCategories(false);
            if (
              deletedCategoryId !== undefined &&
              category === String(deletedCategoryId)
            ) {
              navigate({ category: "" });
            }
            router.refresh();
          }}
        />
      )}
      {deleteConfirmation && (
        <DeleteProductConfirmationModal
          product={
            deleteConfirmation.type === "single"
              ? deleteConfirmation.product
              : null
          }
          selectedCount={
            deleteConfirmation.type === "selected"
              ? deleteConfirmation.ids.length
              : 0
          }
          isPending={isDeleting}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}
