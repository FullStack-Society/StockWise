"use client";

import { useState } from "react";
import type { Product } from "@/lib/inventory/types";
import type { PurchaseOrder } from "@/lib/api/orders";
import CreateOrderDialog from "./CreateOrderDialog";
import OrdersHeader from "./OrdersHeader";
import OrdersList from "./OrdersList";
import styles from "@/styles/orders/OrdersBrowser.module.css";

type Props = {
  products: Product[];
  orders: PurchaseOrder[];
};

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function OrdersBrowser({ products, orders }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const filteredOrders = orders.filter((order) => {
    if (!startDate && !endDate) return true;
    const timestamp = Date.parse(order.createdAt);
    if (Number.isNaN(timestamp)) return false;
    const orderDate = localDateKey(new Date(timestamp));
    return (
      (!startDate || orderDate >= startDate) &&
      (!endDate || orderDate <= endDate)
    );
  });
  const hasDateFilter = Boolean(startDate || endDate);

  return (
    <main className={styles.page}>
      <OrdersHeader
        canCreate={products.length > 0}
        onCreate={() => setShowCreate(true)}
      />

      <section className={styles.dateFilters} aria-label="Filter orders by date">
        <label>
        <span>From</span>
        <input
          type="date"
          value={startDate}
          max={endDate || undefined}
          onChange={(event) => setStartDate(event.target.value)}
        />
        </label>
        <label>
        <span>To</span>
        <input
          type="date"
          value={endDate}
          min={startDate || undefined}
          onChange={(event) => setEndDate(event.target.value)}
        />
        </label>
        {hasDateFilter && (
        <button
          type="button"
          className={styles.clearFilters}
          onClick={() => {
            setStartDate("");
            setEndDate("");
          }}
        >
          Clear dates
        </button>
        )}
        {hasDateFilter && (
        <span className={styles.resultCount} aria-live="polite">
          {filteredOrders.length}{" "}
          {filteredOrders.length === 1 ? "order" : "orders"}
        </span>
        )}
      </section>

      {products.length === 0 && (
        <p className={styles.notice}>
        Add products to inventory before creating an order.
        </p>
      )}
      <OrdersList
        orders={filteredOrders}
        emptyTitle={
        hasDateFilter
          ? "No purchase orders in this date range"
          : "No purchase order yet"
        }
        emptyDescription={
        hasDateFilter
          ? "Try changing the start or end date."
          : "Orders stay separate from on-hand inventory until you receive them."
        }
      />

      {showCreate && (
        <CreateOrderDialog
          products={products}
          onClose={() => setShowCreate(false)}
        />
      )}
    </main>
  );
}
