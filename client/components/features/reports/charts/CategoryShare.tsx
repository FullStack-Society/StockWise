"use client";

import type { InventoryReportData } from "@/lib/api/reports";
import { formatPreferredCurrency } from "@/lib/utils/format";
import styles from "@/styles/reports/CategoryShare.module.css";
import { useUserPreferences } from "@/components/providers/UserPreferencesProvider";

const COLORS = [
  "#e99540",
  "#3fb97a",
  "#65a7dc",
  "#bb83da",
  "#dc6e6e",
  "#d6bd53",
];

export default function CategoryShare({
  report,
  categoryNames,
}: {
  report: InventoryReportData;
  categoryNames: string[];
}) {
  const { currency, currencyRates } = useUserPreferences();
  const grouped = new Map<string, number>(
    categoryNames.map((categoryName) => [categoryName, 0]),
  );
  for (const product of report.products) {
    grouped.set(
      product.category,
      (grouped.get(product.category) ?? 0) +
        Number(product.price) * product.quantity,
    );
  }
  const raw = [...grouped.entries()].map(([label, value]) => ({
    label,
    value,
  }));
  const useUnits = raw.reduce((sum, item) => sum + item.value, 0) === 0;
  if (useUnits) {
    grouped.clear();
    categoryNames.forEach((categoryName) => grouped.set(categoryName, 0));
    for (const product of report.products) {
      grouped.set(
        product.category,
        (grouped.get(product.category) ?? 0) + product.quantity,
      );
    }
  }
  const entries = [...grouped.entries()].map(([label, value]) => ({
    label,
    value,
  }));
  const total = entries.reduce((sum, item) => sum + item.value, 0);
  const circumference = 2 * Math.PI * 62;
  let accumulated = 0;

  return (
    <section
      className={styles.categoryPanel}
      aria-labelledby="category-share-title"
    >
      <div className={styles.panelHead}>
        <div>
          <h2 id="category-share-title" className={styles.panelTitle}>
            Inventory by Category
          </h2>
          <p className={styles.panelSub}>
            {useUnits ? "Share by units" : "Share by current inventory value"}
          </p>
        </div>
      </div>
      {entries.length > 0 ? (
        <>
          <svg
            className={styles.donut}
            viewBox="0 0 160 160"
            role="img"
            aria-label="Inventory distribution by category"
          >
            <circle cx="80" cy="80" r="62" className={styles.donutTrack} />
            {total > 0 && entries.map((item, index) => {
              const fraction = item.value / total;
              const offset = accumulated;
              accumulated += fraction * circumference;
              return (
                <circle
                  key={item.label}
                  cx="80"
                  cy="80"
                  r="62"
                  fill="none"
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth="16"
                  strokeDasharray={`${fraction * circumference} ${circumference}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 80 80)"
                >
                  <title>{`${item.label}: ${useUnits ? `${item.value.toLocaleString()} units` : formatPreferredCurrency(item.value, currency, currencyRates)} · ${((item.value / total) * 100).toFixed(1)}% of inventory`}</title>
                </circle>
              );
            })}
            <text
              x="80"
              y="77"
              textAnchor="middle"
              className={styles.donutTotal}
            >
              {entries.length}
            </text>
            <text
              x="80"
              y="96"
              textAnchor="middle"
              className={styles.donutLabel}
            >
              {total > 0 ? "categories" : "no stock"}
            </text>
          </svg>
          {total === 0 && (
            <p className={styles.emptyCategoryValue}>
              Categories appear here as stock is assigned to them.
            </p>
          )}
          <ul
            className={`${styles.categoryList}${entries.length > 5 ? ` ${styles.categoryListScrollable}` : ""}`}
          >
            {entries.map((item, index) => (
              <li key={item.label} className={styles.categoryRow}>
                <span
                  className={styles.dot}
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className={styles.categoryName}>{item.label}</span>
                <strong className={styles.categoryPct}>
                  {total ? `${((item.value / total) * 100).toFixed(1)}%` : "0%"}
                </strong>
                <span className={styles.categoryValue}>
                  {useUnits
                    ? `${item.value.toLocaleString()} units`
                    : formatPreferredCurrency(
                        item.value,
                        currency,
                        currencyRates,
                      )}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className={styles.emptyCategory}>
          No active inventory to summarize.
        </p>
      )}
    </section>
  );
}
