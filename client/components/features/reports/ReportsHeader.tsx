import ReportActions from "./ReportActions";
import styles from "@/styles/reports/ReportsHeader.module.css";

export default function ReportsHeader() {
  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>Reports &amp; Analytics</h1>
        <p className={styles.subtitle}>
          Real-time performance metrics and historical data visualizations.
        </p>
      </div>
      <ReportActions />
    </header>
  );
}
