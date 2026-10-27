import Link from "next/link";
import { ROUTES } from "@/app/routes";
import type { Product, StockStatus } from "@/lib/inventory/types";
import styles from "@/styles/dashboard/RecentInventory.module.css";

const BADGE: Record<StockStatus, string> = {
  "in-stock": styles.badge,
  "low-stock": `${styles.badge} ${styles.badgeLow}`,
  "out-of-stock": `${styles.badge} ${styles.badgeCritical}`,
};

const STATUS_LABEL: Record<StockStatus, string> = {
  "in-stock": "In stock",
  "low-stock": "Low stock",
  "out-of-stock": "Out of stock",
};

export default function RecentInventory({ products }: { products: Product[] }) {
  const recent = [...products]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 5);

  return (
    <section className={styles.tablePanel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Recent Inventory</h2>
        <Link href={ROUTES.inventory} className={styles.viewAll}>
          View all
        </Link>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Item name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Stock level</th>
              <th className={styles.alignRight}>Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((product) => (
              <tr key={product.id}>
                <td className={styles.itemName}>{product.name}</td>
                <td>{product.sku}</td>
                <td>{product.categoryName ?? "Uncategorized"}</td>
                <td
                  className={`${styles.level} ${product.status !== "in-stock" ? styles.levelWarn : ""}`}
                >
                  {product.quantity}
                </td>
                <td className={styles.alignRight}>
                  <span className={BADGE[product.status]}>
                    {STATUS_LABEL[product.status]}
                  </span>
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={5}>No inventory products have been added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
