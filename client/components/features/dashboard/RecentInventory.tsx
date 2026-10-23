import Link from "next/link";
import {
  RECENT_INVENTORY,
  STATUS_LABEL,
  type StockStatus,
} from "@/lib/mock-data/dashboard";
import styles from "@/styles/dashboard/RecentInventory.module.css";

const BADGE: Record<StockStatus, string> = {
  "in-stock": styles.badge,
  "low-stock": `${styles.badge} ${styles.badgeLow}`,
  critical: `${styles.badge} ${styles.badgeCritical}`,
};

export default function RecentInventory() {
  return (
    <section className={styles.tablePanel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Recent Inventory</h2>
        <Link href="/inventory" className={styles.viewAll}>
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
            {RECENT_INVENTORY.map((row) => (
              <tr key={row.sku}>
                <td className={styles.itemName}>{row.name}</td>
                <td>{row.sku}</td>
                <td>{row.category}</td>
                <td
                  className={`${styles.level} ${row.status !== "in-stock" ? styles.levelWarn : ""}`}
                >
                  {row.level}
                </td>
                <td className={styles.alignRight}>
                  <span className={BADGE[row.status]}>
                    {STATUS_LABEL[row.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
