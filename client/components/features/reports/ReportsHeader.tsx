import ReportActions from "./ReportActions";
import type { InventoryReportData, ReportPeriod } from "@/lib/api/reports";
import styles from "@/styles/reports/ReportsHeader.module.css";

export default function ReportsHeader({
  days,
  report,
  purchaseOrderValue,
}: {
  days: ReportPeriod;
  report?: InventoryReportData;
  purchaseOrderValue?: number;
}) {
  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>Reports &amp; Analytics</h1>
        <p className={styles.subtitle}>
          Sales, inventory value, purchase orders, and stock movement.
        </p>
      </div>
      <ReportActions
        days={days}
        report={report}
        purchaseOrderValue={purchaseOrderValue}
      />
    </header>
  );
}
