"use client";

import { useMemo, useState } from "react";
import { PRODUCTS, getStatus, type Product } from "@/lib/mock-data/inventory";
import FilterBar, { EMPTY_FILTERS, type Filters } from "./FilterBar";
import InventoryTable from "./InventoryTable";
import Pagination from "./Pagination";
import styles from "@/styles/inventory/InventoryBrowser.module.css";

const PAGE_SIZE = 5;

/** Client container: owns the filters, selection and pagination state. */
export default function InventoryBrowser() {
  // TODO: replace PRODUCTS with data fetched from your API / database
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q) || p.barcode.includes(q)) &&
        (!filters.category || p.category === filters.category) &&
        (!filters.supplier || p.supplier === filters.supplier) &&
        (!filters.status || getStatus(p.quantity) === filters.status),
    );
  }, [products, filters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  function updateFilters(patch: Partial<Filters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  function toggleOne(id: string) {
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

  function handleEdit(product: Product) {
    // TODO: open an edit form / navigate to /inventory/[id]
    console.log("edit", product.id);
  }

  function handleDelete(product: Product) {
    // TODO: call your API, then update state
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    setProducts((list) => list.filter((p) => p.id !== product.id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(product.id);
      return next;
    });
  }

  return (
    <>
      <FilterBar
        filters={filters}
        onChange={updateFilters}
        onClear={clearFilters}
      />

      <section className={styles.tablePanel}>
        <InventoryTable
          rows={rows}
          selected={selected}
          onToggle={toggleOne}
          onToggleAll={toggleAll}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <div className={styles.footer}>
          <span>
            {filtered.length === 0
              ? "No items"
              : `Showing ${start + 1}-${start + rows.length} of ${filtered.length} items`}
          </span>
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onChange={setPage}
          />
        </div>
      </section>
    </>
  );
}
