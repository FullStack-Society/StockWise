import type { StockStatus } from "@/lib/mock-data/inventory";
import styles from "@/styles/ui/StatusBadge.module.css";

const LABEL: Record<StockStatus, string> = {
  "in-stock": "In stock",
  "low-stock": "Low stock",
  critical: "Critical",
  "out-of-stock": "Out of stock",
};

const VARIANT: Record<StockStatus, string> = {
  "in-stock": styles.inStock,
  "low-stock": styles.lowStock,
  critical: styles.critical,
  "out-of-stock": styles.outOfStock,
};

export default function StatusBadge({ status }: { status: StockStatus }) {
  return (
    <span className={`${styles.badge} ${VARIANT[status]}`}>
      {LABEL[status]}
    </span>
  );
}
