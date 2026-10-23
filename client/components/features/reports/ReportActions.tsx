"use client";

import { Printer, Download } from "lucide-react";
import { topProducts } from "@/lib/mock-data/reports";
import styles from "@/styles/reports/ReportActions.module.css";

export default function ReportActions() {
  function exportCsv() {
    const rows = [
      ["Product", "Units Sold", "Stock Health", "Total Sales"],
      ...topProducts.map((p) => [p.name, p.unitsSold, p.health, p.totalSales]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "stockwise-report.csv";
    a.click();
    URL.revokeObjectURL(url);
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
      <button type="button" className={styles.actionBtn} onClick={exportCsv}>
        <Download size={14} aria-hidden /> Export CSV
      </button>
    </div>
  );
}
