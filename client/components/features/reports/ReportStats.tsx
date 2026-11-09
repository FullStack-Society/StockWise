"use client";

import {
  DollarSign,
  Boxes,
  ShoppingCart,
  TriangleAlert,
} from "lucide-react";
import type { InventoryReportData } from "@/lib/api/reports";
import { formatDate, formatPreferredCurrency } from "@/lib/utils/format";
import styles from "@/styles/reports/ReportStats.module.css";
import { useUserPreferences } from "@/components/providers/UserPreferencesProvider";

const ICONS = {
  value: DollarSign,
  stockUnits: Boxes,
  alerts: TriangleAlert,
  purchaseOrders: DollarSign,
  sales: ShoppingCart,
  salesRevenue: DollarSign,
};

function comparison(current: number, previous: number, subject = "activity") {
  if (previous === 0)
    return current === 0
      ? `No ${subject} in either period`
      : `New ${subject} in this period`;
  const percent = ((current - previous) / previous) * 100;
  const rounded = Math.abs(percent).toFixed(1);
  return `${percent >= 0 ? "+" : "−"}${rounded}% vs previous period`;
}

export default function ReportStats({
  report,
  purchaseOrderValue,
}: {
  report: InventoryReportData;
  purchaseOrderValue: number;
}) {
  const { currency, currencyRates, date_format } = useUserPreferences();
  const stats = [
    {
      id: "value",
      label: "Inventory Selling Value",
      value: formatPreferredCurrency(
        Number(report.inventory_value),
        currency,
        currencyRates,
      ),
      change: "On-hand units × selling price",
      icon: "value" as const,
      trend: "up" as const,
    },
    {
      id: "purchaseOrders",
      label: "Purchase Order Value",
      value: formatPreferredCurrency(
        purchaseOrderValue,
        currency,
        currencyRates,
      ),
      change: "Across all recorded orders",
      icon: "purchaseOrders" as const,
      trend: "up" as const,
    },
    {
      id: "stockUnits",
      label: "Units in Stock",
      value: report.stock_units.toLocaleString(),
      change: "Across all active products",
      icon: "stockUnits" as const,
      trend: "up" as const,
    },
    {
      id: "salesRevenue",
      label: "Recorded Sales Revenue",
      value: formatPreferredCurrency(
        Number(report.sales_revenue),
        currency,
        currencyRates,
      ),
      change: `Earlier sales aren’t included · tracking since ${formatDate(
        report.sales_revenue_tracking_since,
        date_format,
      )}`,
      icon: "salesRevenue" as const,
      trend: "neutral" as const,
    },
    {
      id: "sales",
      label: "Sales",
      value: report.sales_count.toLocaleString(),
      change: `${report.units_sold.toLocaleString()} units sold · ${comparison(
        report.sales_count,
        report.previous_sales_count,
        "sales",
      )}`,
      icon: "sales" as const,
      trend: "neutral" as const,
    },
    {
      id: "alerts",
      label: "Low / Critical",
      value: (report.low_stock_count + report.critical_count).toLocaleString(),
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
              className={
                s.trend === "neutral"
                  ? styles.changeNeutral
                  : s.trend === "up"
                    ? styles.changeUp
                    : styles.changeDown
              }
            >
              {s.change}
            </div>
          </article>
        );
      })}
    </section>
  );
}
