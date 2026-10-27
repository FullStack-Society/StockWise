import ReportActions from "./ReportActions";
import type { InventoryReportData, ReportPeriod } from "@/lib/api/reports";
import styles from "@/styles/reports/ReportsHeader.module.css";

export default function ReportsHeader({
  days,
  report,
}: {
  days: ReportPeriod;
  report?: InventoryReportData;
}) {
  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>Reports &amp; Analytics</h1>
        <p className={styles.subtitle}>
          Current inventory value and recorded stock movement for your organization.
        </p>
      </div>
      <ReportActions days={days} report={report} />
    </header>
  );
}
