import { Search, Eye, Lightbulb } from "lucide-react";
import { reportFooterStats } from "@/lib/mock-data/reports";
import styles from "@/styles/reports/ReportFooterStats.module.css";

const ICONS = { search: Search, eye: Eye, bulb: Lightbulb };

export default function ReportFooterStats() {
  return (
    <section className={styles.footerGrid}>
      {reportFooterStats.map((s) => {
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
