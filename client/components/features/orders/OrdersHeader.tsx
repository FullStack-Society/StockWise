"use client";

import { Plus } from "lucide-react";
import styles from "@/styles/orders/OrdersHeader.module.css";

export default function OrdersHeader({
  canCreate,
  onCreate,
}: {
  canCreate: boolean;
  onCreate: () => void;
}) {
  return (
    <header className={styles.header}>
      <div>
        <h1>Orders</h1>
        <p>Track ordered quantities and receive deliveries into inventory.</p>
      </div>
      <button
        type="button"
        className={styles.primary}
        onClick={onCreate}
        disabled={!canCreate}
      >
        <Plus size={15} />
        Create order
      </button>
    </header>
  );
}
