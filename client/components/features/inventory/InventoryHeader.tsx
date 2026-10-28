"use client";

import { Download, FileUp, Plus } from "lucide-react";
import styles from "@/styles/inventory/InventoryHeader.module.css";

export default function InventoryHeader({
  onAdd,
  onImport,
  onExport,
  canExport,
}: {
  onAdd: () => void;
  onImport: () => void;
  onExport: () => void;
  canExport: boolean;
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
        <button
          type="button"
          onClick={onExport}
          className={styles.button}
          disabled={!canExport}
        >
          <Download size={14} />
          Export CSV
        </button>
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
