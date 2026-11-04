import type { InventoryStat } from "@/lib/inventory/types";
import styles from "@/styles/inventory/InventoryFooter.module.css";

export default function InventoryFooter({ items }: { items: InventoryStat[] }) {
  return (
    <section className={styles.footer}>
      {items.map(({ label, value, icon: Icon }) => (
        <article key={label} className={styles.card}>
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
