import Link from "next/link";
import { Search, Pencil } from "lucide-react";
import { topProducts } from "@/lib/mock-data/reports";
import { formatCurrency } from "@/lib/utils/format";
import { ROUTES } from "@/app/routes";
import styles from "@/styles/reports/TopProductsTable.module.css";

export default function TopProductsTable() {
  return (
    <section className={styles.panelBox}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Top Performing Products</h2>
        <Link href={ROUTES.inventory} className={styles.link}>
          View Detailed Report
        </Link>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Units Sold</th>
              <th>Stock Health</th>
              <th>Total Sales</th>
              <th className={styles.alignRight}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className={styles.productCell}>
                    <span className={styles.thumb} aria-hidden />
                    {p.name}
                  </div>
                </td>
                <td>{p.unitsSold.toLocaleString()}</td>
                <td>
                  <span
                    className={
                      p.health === "Optimal"
                        ? styles.healthOk
                        : styles.healthWarn
                    }
                  >
                    {p.health}
                  </span>
                </td>
                <td>{formatCurrency(p.totalSales)}</td>
                <td className={styles.alignRight}>
                  {p.trend === "up" ? (
                    <Search
                      size={13}
                      className={styles.trendUp}
                      aria-label="Trending up"
                    />
                  ) : (
                    <Pencil
                      size={13}
                      className={styles.trendDown}
                      aria-label="Needs attention"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
