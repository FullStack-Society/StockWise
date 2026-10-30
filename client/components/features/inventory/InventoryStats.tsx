import type { InventoryStat } from "@/lib/inventory/types";
import styles from "@/styles/inventory/InventoryStats.module.css";

export default function InventoryStats({ items }: { items: InventoryStat[] }) {
  return (
    <section className={styles.stats}>
      {items.map(({ label, value, icon: Icon }) => (
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
