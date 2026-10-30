"use client";

import { Printer, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { type InventoryReportData, type ReportPeriod } from "@/lib/api/reports";
import { ROUTES } from "@/app/routes";
import { useUserPreferences } from "@/components/layout/UserPreferencesProvider";
import styles from "@/styles/reports/ReportActions.module.css";

export default function ReportActions({
  days,
  report,
}: {
  days: ReportPeriod;
  report?: InventoryReportData;
}) {
  const router = useRouter();
  const { currency, currencyRates } = useUserPreferences();
  const conversionRate =
    currency === "USD" ? 1 : (currencyRates?.[currency] ?? null);

  function exportCsv() {
    if (!report || conversionRate === null) return;
    const rows = [
      ["Inventory Report", `Last ${days} days`],
      ["Currency", currency],
      ["Period start", report.period_start],
      ["Products", report.product_count],
      ["Stock units", report.stock_units],
      [
        `Current inventory value (${currency})`,
        Number(report.inventory_value) * conversionRate,
      ],
      ["Units received", report.units_received],
      ["Units issued", report.units_issued],
      ["Transactions", report.transaction_count],
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

  function changeRange(value: string) {
    const nextDays = Number(value);
    if (nextDays === 30 || nextDays === 90 || nextDays === 365) {
      router.push(`${ROUTES.reports}?days=${nextDays}`);
    }
  }

  return (
    <div className={styles.actions}>
      <label className={styles.rangeLabel}>
        <span>Period</span>
        <select
          value={days}
          onChange={(event) => changeRange(event.target.value)}
        >
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
          <option value={365}>12 months</option>
        </select>
      </label>
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
