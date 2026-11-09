"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/inventory/types";
import type { PurchaseOrder, PurchaseOrderHistoryEvent } from "@/lib/api/orders";
import CreateOrderDialog from "./CreateOrderDialog";
import OrdersHeader from "./OrdersHeader";
import OrdersList from "./OrdersList";
import OrdersHistory from "./OrdersHistory";
import DestructiveConfirmationModal from "@/components/ui/DestructiveConfirmationModal";
import { useUserPreferences } from "@/components/providers/UserPreferencesProvider";
import { formatDateKey } from "@/lib/utils/format";
import { deletePurchaseOrderAction } from "@/lib/orders/actions";
import styles from "@/styles/orders/OrdersBrowser.module.css";

type Props = {
  products: Product[];
  orders: PurchaseOrder[];
  history: PurchaseOrderHistoryEvent[];
};

export default function OrdersBrowser({ products, orders, history }: Props) {
  const router = useRouter();
  const { timezone } = useUserPreferences();
  const [showCreate, setShowCreate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<PurchaseOrder | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const filteredOrders = orders.filter((order) => {
    if (!startDate && !endDate) return true;
    const timestamp = Date.parse(order.createdAt);
    if (Number.isNaN(timestamp)) return false;
    const orderDate = formatDateKey(new Date(timestamp), timezone);
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
        onHistory={() => setShowHistory(true)}
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
        onEdit={(order) => setEditingOrder(order)}
        onDelete={(order) => {
          setDeleteError("");
          setDeleteOrder(order);
        }}
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
          key="new-order"
          products={products}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editingOrder && (
        <CreateOrderDialog
          key={`edit-order-${editingOrder.id}`}
          products={products}
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
        />
      )}
      {deleteOrder && (
        <DestructiveConfirmationModal
          title={`Delete order #${deleteOrder.orderNumber}?`}
          description="This removes the order from the active list. Its details and activity will remain in order history."
          error={deleteError}
          isPending={isDeleting}
          onCancel={() => setDeleteOrder(null)}
          onConfirm={async () => {
            setIsDeleting(true);
            setDeleteError("");
            try {
              const result = await deletePurchaseOrderAction(deleteOrder.id);
              if (!result.ok) {
                setDeleteError(result.error);
                return;
              }
              setDeleteOrder(null);
              router.refresh();
            } catch {
              setDeleteError("Could not delete this order. Please try again.");
            } finally {
              setIsDeleting(false);
            }
          }}
        />
      )}
      {showHistory && (
        <OrdersHistory
          events={history}
          timezone={timezone}
          onClose={() => setShowHistory(false)}
        />
      )}
    </main>
  );
}
