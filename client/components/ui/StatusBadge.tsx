import type { StockStatus } from "@/lib/inventory/types";
import styles from "@/styles/ui/StatusBadge.module.css";

const LABEL: Record<StockStatus, string> = {
  "in-stock": "In stock",
  "low-stock": "Low stock",
  "out-of-stock": "Critical",
};

const VARIANT: Record<StockStatus, string> = {
  "in-stock": styles.inStock,
  "low-stock": styles.lowStock,
  "out-of-stock": styles.critical,
};

export default function StatusBadge({ status }: { status: StockStatus }) {
  return (
    <span className={`${styles.badge} ${VARIANT[status]}`}>
      {LABEL[status]}
    </span>
  );
}
