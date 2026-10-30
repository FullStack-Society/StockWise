import Link from "next/link";
import { ROUTES } from "@/app/routes";
import type { DashboardRecentProduct } from "@/lib/api/reports";
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
  "out-of-stock": "Critical",
};

export default function RecentInventory({
  products,
  recentProducts,
}: {
  products: Product[];
  recentProducts: DashboardRecentProduct[];
}) {
  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );
  const recent = recentProducts
    .map((receipt) => productsById.get(receipt.product_id))
    .filter((product): product is Product => product !== undefined);

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
                <td className={styles.itemName}>
                  <Link
                    href={`${ROUTES.inventory}?search=${encodeURIComponent(product.sku)}`}
                    className={styles.productLink}
                  >
                    {product.name}
                  </Link>
                </td>
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
                <td colSpan={5}>No stock arrivals have been recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
