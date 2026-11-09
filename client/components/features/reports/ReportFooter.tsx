import { ReceiptText, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import type { InventoryReportData } from "@/lib/api/reports";
import styles from "@/styles/reports/ReportFooter.module.css";

const ICONS = {
  transactions: ReceiptText,
  received: ArrowDownToLine,
  issued: ArrowUpFromLine,
};

export default function ReportFooter({
  report,
}: {
  report: InventoryReportData;
}) {
  const stats = [
    {
      id: "transactions",
      label: "Transactions · This month",
      value: report.monthly_transaction_count.toLocaleString(),
      icon: "transactions" as const,
    },
    {
      id: "received",
      label: "Units received · This month",
      value: report.monthly_units_received.toLocaleString(),
      icon: "received" as const,
    },
    {
      id: "issued",
      label: "Net stock movement · This month",
      value: `${report.monthly_units_received - report.monthly_units_issued >= 0 ? "+" : ""}${(report.monthly_units_received - report.monthly_units_issued).toLocaleString()} units`,
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
