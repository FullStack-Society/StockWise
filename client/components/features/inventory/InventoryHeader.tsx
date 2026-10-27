"use client";

import { FileUp, Plus } from "lucide-react";
import styles from "@/styles/inventory/InventoryHeader.module.css";

export default function InventoryHeader({
  onAdd,
  onImport,
}: {
  onAdd: () => void;
  onImport: () => void;
}) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Inventory</h1>
        <p className={styles.subtitle}>
          Manage and track your product stock levels across all categories.
        </p>
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={onImport} className={styles.button}>
          <FileUp size={14} />
          Import Data
        </button>
        <button
          type="button"
          onClick={onAdd}
          className={`${styles.button} ${styles.buttonPrimary}`}
        >
          <Plus size={14} />
          Add Product
        </button>
      </div>
    </div>
  );
}
