import { DollarSign, Receipt, Boxes, TrendingUp } from "lucide-react";
import { reportStats } from "@/lib/mock-data/reports";
import styles from "@/styles/reports/CategoryShare.module.css";

const ICONS = {
  revenue: DollarSign,
  avg: Receipt,
  units: Boxes,
  roi: TrendingUp,
};

export default function ReportStats() {
  return (
    <section className={styles.statGrid} aria-label="Key metrics">
      {reportStats.map((s) => {
        const Icon = ICONS[s.icon];
        return (
          <article key={s.id} className={styles.statCard}>
            <div className={styles.statTop}>
              <span className={styles.statLabel}>{s.label}</span>
              <span className={styles.statIcon}>
                <Icon size={14} aria-hidden />
              </span>
            </div>
            <div className={styles.statValue}>{s.value}</div>
            <div
              className={s.trend === "up" ? styles.changeUp : styles.changeDown}
            >
              {s.change}
            </div>
          </article>
        );
      })}
    </section>
  );
}
