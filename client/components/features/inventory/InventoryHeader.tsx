import { FileUp, Plus } from "lucide-react";
import styles from "@/styles/inventory/InventoryHeader.module.css";

export default function InventoryHeader() {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Inventory</h1>
        <p className={styles.subtitle}>
          Manage and track your product stock levels across all categories.
        </p>
      </div>

      <div className={styles.actions}>
        {/* TODO: hook these up (file upload dialog / add product form) */}
        <button type="button" className={styles.button}>
          <FileUp size={14} />
          Import Data
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
        >
          <Plus size={14} />
          Add Product
        </button>
      </div>
    </div>
  );
}
