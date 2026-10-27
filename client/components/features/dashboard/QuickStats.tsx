import { AlertTriangle, Boxes, Layers3, Package } from "lucide-react";
import type { Product } from "@/lib/inventory/types";
import styles from "@/styles/dashboard/QuickStats.module.css";

export default function QuickStats({ products }: { products: Product[] }) {
  const stats = [
    {
      label: "Product categories",
      value: new Set(
        products.map((p) => p.categoryId).filter((id) => id !== null),
      ).size,
      icon: Layers3,
    },
    {
      label: "Low stock",
      value: products.filter((p) => p.status === "low-stock").length,
      icon: AlertTriangle,
    },
    {
      label: "Out of stock",
      value: products.filter((p) => p.status === "out-of-stock").length,
      icon: Boxes,
    },
    {
      label: "Products tracked",
      value: products.length,
      icon: Package,
    },
  ];

  return (
    <section className={styles.quick}>
      {stats.map(({ label, value, icon: Icon }) => (
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
