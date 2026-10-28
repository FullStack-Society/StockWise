import { ReceiptText, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import type { InventoryReportData } from "@/lib/api/reports";
import styles from "@/styles/reports/ReportFooterStats.module.css";

const ICONS = {
  transactions: ReceiptText,
  received: ArrowDownToLine,
  issued: ArrowUpFromLine,
};

export default function ReportFooterStats({
  report,
}: {
  report: InventoryReportData;
}) {
  const stats = [
    {
      id: "transactions",
      label: `Transactions · ${report.days} days`,
      value: report.transaction_count.toLocaleString(),
      icon: "transactions" as const,
    },
    {
      id: "received",
      label: "Units received",
      value: report.units_received.toLocaleString(),
      icon: "received" as const,
    },
    {
      id: "issued",
      label: "Net stock movement",
      value: `${report.units_received - report.units_issued >= 0 ? "+" : ""}${(report.units_received - report.units_issued).toLocaleString()} units`,
      icon: "issued" as const,
    },
  ];

  return (
    <section className={styles.footerGrid}>
      {stats.map((s) => {
        const Icon = ICONS[s.icon];
        return (
          <div key={s.id} className={styles.footerCard}>
            <Icon size={16} className={styles.footerIcon} aria-hidden />
            <div>
              <div className={styles.footerLabel}>{s.label}</div>
              <div className={styles.footerValue}>{s.value}</div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
