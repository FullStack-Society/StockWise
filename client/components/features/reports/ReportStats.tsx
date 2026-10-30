"use client";

import {
  DollarSign,
  Package,
  ArrowUpFromLine,
  TriangleAlert,
} from "lucide-react";
import type { InventoryReportData } from "@/lib/api/reports";
import { formatPreferredCurrency } from "@/lib/utils/format";
import styles from "@/styles/reports/ReportStats.module.css";
import { useUserPreferences } from "@/components/layout/UserPreferencesProvider";

const ICONS = {
  value: DollarSign,
  products: Package,
  issued: ArrowUpFromLine,
  alerts: TriangleAlert,
};

function comparison(current: number, previous: number) {
  if (previous === 0)
    return current === 0
      ? "No movement in either period"
      : "New movement in this period";
  const percent = ((current - previous) / previous) * 100;
  const rounded = Math.abs(percent).toFixed(1);
  return `${percent >= 0 ? "+" : "−"}${rounded}% vs previous period`;
}

export default function ReportStats({
  report,
}: {
  report: InventoryReportData;
}) {
  const { currency, currencyRates } = useUserPreferences();
  const stats = [
    {
      id: "value",
      label: "Current Inventory Value",
      value: formatPreferredCurrency(
        Number(report.inventory_value),
        currency,
        currencyRates,
      ),
      change: "Based on current product prices",
      icon: "value" as const,
      trend: "up" as const,
    },
    {
      id: "products",
      label: "Active Products",
      value: report.product_count.toLocaleString(),
      change: `${report.stock_units.toLocaleString()} units in stock`,
      icon: "products" as const,
      trend: "up" as const,
    },
    {
      id: "issued",
      label: "Units Issued",
      value: report.units_issued.toLocaleString(),
      change: comparison(report.units_issued, report.previous_units_issued),
      icon: "issued" as const,
      trend:
        report.units_issued >= report.previous_units_issued
          ? ("up" as const)
          : ("down" as const),
    },
    {
      id: "alerts",
      label: "Low / Critical",
      value: (
        report.low_stock_count + report.critical_count
      ).toLocaleString(),
      change: `${report.low_stock_count} low · ${report.critical_count} critical`,
      icon: "alerts" as const,
      trend:
        report.low_stock_count + report.critical_count
          ? ("down" as const)
          : ("up" as const),
    },
  ];

  return (
    <section className={styles.statGrid} aria-label="Key metrics">
      {stats.map((s) => {
        const Icon = ICONS[s.icon];
        return (
          <article key={s.id} className={styles.statCard}>
            <div className={styles.statTop}>
              <span className={styles.statLabel}>{s.label}</span>
              <span className={styles.statIcon}>
                <Icon size={14} aria-hidden />
              </span>
            </div>
            <div className={styles.statValue}>{s.value}</div>
            <div
              className={s.trend === "up" ? styles.changeUp : styles.changeDown}
            >
              {s.change}
            </div>
          </article>
        );
      })}
    </section>
  );
}
