"use client";

import { Clock3, DollarSign, Package } from "lucide-react";
import { useUserPreferences } from "@/components/layout/UserPreferencesProvider";
import { formatPreferredCurrency } from "@/lib/utils/format";
import type { Product } from "@/lib/inventory/types";
import styles from "@/styles/dashboard/DashboardFooter.module.css";

function relativeTime(timestamp: number | null) {
  if (timestamp === null) return "No stock updates";
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60)
    return `${elapsedMinutes} min${elapsedMinutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function DashboardFooter({ products }: { products: Product[] }) {
  const { currency, currencyRates } = useUserPreferences();
  const latestUpdate = products.reduce<number | null>((latest, product) => {
    const timestamp = Date.parse(product.updatedAt);
    return Number.isNaN(timestamp) || (latest !== null && timestamp <= latest)
      ? latest
      : timestamp;
  }, null);
  const valuation = products.reduce(
    (total, product) => total + product.price * product.quantity,
    0,
  );
  const stats = [
    {
      label: "Products tracked",
      value: products.length.toLocaleString(),
      icon: Package,
    },
    {
      label: "Last inventory update",
      value: relativeTime(latestUpdate),
      icon: Clock3,
    },
    {
      label: `Valuation (${currency})`,
      value: formatPreferredCurrency(valuation, currency, currencyRates),
      icon: DollarSign,
    },
  ];

  return (
    <section className={styles.footer} aria-label="Inventory summary">
      {stats.map(({ label, value, icon: Icon }) => (
        <article className={styles.card} key={label}>
          <Icon size={16} aria-hidden />
          <div>
            <p className={styles.label}>{label}</p>
            <p className={styles.value}>{value}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
