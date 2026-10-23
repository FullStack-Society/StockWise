import { QUICK_STATS } from "@/lib/mock-data/dashboard";
import styles from "@/styles/dashboard/QuickStats.module.css";

export default function QuickStats() {
  return (
    <section className={styles.quick}>
      {QUICK_STATS.map(({ label, value, icon: Icon }) => (
        <article key={label} className={styles.quickCard}>
          <Icon size={18} className={styles.quickIcon} />
          <div>
            <p className={styles.quickLabel}>{label}</p>
            <p className={styles.quickValue}>{value}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
