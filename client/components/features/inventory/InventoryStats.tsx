import { INVENTORY_STATS } from "@/lib/mock-data/inventory";
import styles from "@/styles/inventory/InventoryStats.module.css";

export default function InventoryStats() {
  return (
    <section className={styles.stats}>
      {INVENTORY_STATS.map(({ label, value, icon: Icon }) => (
        <article key={label} className={styles.statCard}>
          <Icon size={18} className={styles.statIcon} />
          <div>
            <p className={styles.statLabel}>{label}</p>
            <p className={styles.statValue}>{value}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
