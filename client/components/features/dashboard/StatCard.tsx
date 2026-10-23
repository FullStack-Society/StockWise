import type { Stat } from "@/lib/mock-data/dashboard";
import styles from "@/styles/dashboard/StatCard.module.css";

export default function StatCard({ label, value, note, icon: Icon }: Stat) {
  return (
    <article className={styles.statCard}>
      <div className={styles.statHead}>
        <p className={styles.statLabel}>{label}</p>
        <div className={styles.statIcon}>
          <Icon size={16} />
        </div>
      </div>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statNote}>{note}</p>
    </article>
  );
}
