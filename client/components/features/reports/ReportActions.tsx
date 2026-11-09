"use client";

import { Printer, Download } from "lucide-react";
import { type InventoryReportData, type ReportPeriod } from "@/lib/api/reports";
import { useUserPreferences } from "@/components/providers/UserPreferencesProvider";
import styles from "@/styles/reports/ReportActions.module.css";

export default function ReportActions({
  days,
  report,
  purchaseOrderValue,
}: {
  days: ReportPeriod;
  report?: InventoryReportData;
  purchaseOrderValue?: number;
}) {
  const { currency, currencyRates, timezone } = useUserPreferences();
  const conversionRate =
    currency === "USD" ? 1 : (currencyRates?.[currency] ?? null);

  function exportCsv() {
    if (!report || conversionRate === null) return;
    const rows = [
      ["Inventory Report", `Last ${days} days`],
      ["Currency", currency],
      ["Timezone", timezone],
      ["Period start", report.period_start],
      ["Products", report.product_count],
      ["Stock units", report.stock_units],
      [
        `Current inventory value (${currency})`,
        Number(report.inventory_value) * conversionRate,
      ],
      [
        `Purchase order value across all tracked orders (${currency})`,
        (purchaseOrderValue ?? 0) * conversionRate,
      ],
      ["Sales", report.sales_count],
      ["Units sold", report.units_sold],
      [
        `Sales revenue (${currency}, tracked since ${report.sales_revenue_tracking_since})`,
        Number(report.sales_revenue) * conversionRate,
      ],
      ["Units received", report.units_received],
      ["Units issued", report.units_issued],
      ["Stock transactions", report.transaction_count],
      [],
      [
        "Daily stock movement",
        "Received value uses current selling prices",
      ],
      [
        "Date",
        "Units received",
        "Units issued",
        `Received stock value (${currency})`,
      ],
      ...report.daily_movement.map((day) => [
        day.day,
        day.units_received,
        day.units_issued,
        Number(day.received_value) * conversionRate,
      ]),
      [],
      [
        "Product",
        "SKU",
        "Category",
        "Units issued",
        "Current stock",
        `Current stock value (${currency})`,
      ],
      ...report.products.map((p) => [
        p.name,
        p.sku,
        p.category,
        p.units_issued,
        p.quantity,
        Number(p.price) * p.quantity * conversionRate,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `stockwise-inventory-report-${days}d.csv`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.actionBtn}
        onClick={() => window.print()}
      >
        <Printer size={14} aria-hidden /> Print Report
      </button>
      <button
        type="button"
        className={styles.actionBtn}
        onClick={exportCsv}
        disabled={!report || conversionRate === null}
        title={
          conversionRate === null
            ? "Waiting for exchange rates before exporting converted values."
            : undefined
        }
      >
        <Download size={14} aria-hidden /> Export CSV
      </button>
    </div>
  );
}
