"use client";

import Link from "next/link";
import type { InventoryReportData } from "@/lib/api/reports";
import { formatPreferredCurrency } from "@/lib/utils/format";
import { ROUTES } from "@/app/routes";
import styles from "@/styles/reports/TopProductsTable.module.css";
import { useUserPreferences } from "@/components/layout/UserPreferencesProvider";

export default function TopProductsTable({
  report,
}: {
  report: InventoryReportData;
}) {
  const { currency, currencyRates } = useUserPreferences();
  const topProducts = report.products
    .filter((product) => product.units_issued > 0)
    .slice(0, 10);

  return (
    <section className={styles.panelBox}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Most Issued Products</h2>
        <Link href={ROUTES.inventory} className={styles.link}>
          View Inventory
        </Link>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Units Issued</th>
              <th>Current Stock</th>
              <th>Stock Health</th>
              <th className={styles.alignRight}>Stock Value</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((p) => {
              const health =
                p.quantity <= 25
                  ? "Critical"
                  : p.quantity <= 50
                    ? "Low stock"
                    : "In stock";
              return (
                <tr key={p.id}>
                  <td>
                    <div className={styles.productCell}>
                      <span className={styles.thumb} aria-hidden />
                      {p.name}
                    </div>
                  </td>
                  <td>{p.units_issued.toLocaleString()}</td>
                  <td>{p.quantity.toLocaleString()}</td>
                  <td>
                    <span
                      className={
                        health === "In stock"
                          ? styles.healthOk
                          : styles.healthWarn
                      }
                    >
                      {health}
                    </span>
                  </td>
                  <td className={styles.alignRight}>
                    {formatPreferredCurrency(
                      Number(p.price) * p.quantity,
                      currency,
                      currencyRates,
                    )}
                  </td>
                </tr>
              );
            })}
            {topProducts.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  No product issues were recorded in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
