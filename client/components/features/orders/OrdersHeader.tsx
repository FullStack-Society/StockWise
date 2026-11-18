"use client";

import { History, Plus } from "lucide-react";
import styles from "@/styles/orders/OrdersHeader.module.css";

export default function OrdersHeader({
  canCreate,
  onCreate,
  onHistory,
}: {
  canCreate: boolean;
  onCreate: () => void;
  onHistory: () => void;
}) {
  return (
    <header className={styles.header}>
      <div>
        <h1>Orders</h1>
        <p>Track ordered quantities and receive deliveries into inventory.</p>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={onHistory}>
          <History size={14} />
          History
        </button>
        <button
          type="button"
          className={styles.primary}
          onClick={onCreate}
          disabled={!canCreate}
        >
          <Plus size={15} />
          Create order
        </button>
      </div>
    </header>
  );
}
