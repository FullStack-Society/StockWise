"use client";

import { Printer, Download } from "lucide-react";
import { type InventoryReportData, type ReportPeriod } from "@/lib/api/reports";
import { useUserPreferences } from "@/components/providers/UserPreferencesProvider";
import styles from "@/styles/reports/ReportActions.module.css";

export default function ReportActions({
  days,
  report,
}: {
  days: ReportPeriod;
  report?: InventoryReportData;
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
        `Stock cost value (${currency})`,
        Number(report.stock_cost_value) * conversionRate,
      ],
      ["Units received", report.units_received],
      ["Units issued", report.units_issued],
      ["Transactions", report.transaction_count],
      [],
      [
        "Daily stock movement",
        "Received value uses current unit costs",
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
