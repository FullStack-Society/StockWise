"use client";

import { Clock3, DollarSign, Package, ShoppingCart } from "lucide-react";
import { useUserPreferences } from "@/components/providers/UserPreferencesProvider";
import type { PurchaseOrder } from "@/lib/api/orders";
import { formatPreferredCurrency } from "@/lib/utils/format";
import type { Product } from "@/lib/inventory/types";
import styles from "@/styles/dashboard/DashboardFooter.module.css";

function relativeTime(timestamp: number | null, emptyLabel: string) {
  if (timestamp === null) return emptyLabel;
  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 60_000),
  );
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60)
    return `${elapsedMinutes} min${elapsedMinutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function DashboardFooter({
  products,
  orders,
}: {
  products: Product[];
  orders: PurchaseOrder[];
}) {
  const { currency, currencyRates } = useUserPreferences();
  const latestUpdate = products.reduce<number | null>((latest, product) => {
    const timestamp = Date.parse(product.updatedAt);
    return Number.isNaN(timestamp) || (latest !== null && timestamp <= latest)
      ? latest
      : timestamp;
  }, null);
  const stockCost = products.reduce(
    (total, product) => total + product.unitCost * product.quantity,
    0,
  );
  const stats = [
    {
      label: "Products tracked",
      value: products.length.toLocaleString(),
      icon: Package,
    },
    {
      label: "Orders tracked",
      value: orders.length.toLocaleString(),
      icon: ShoppingCart,
    },
    {
      label: "Last inventory update",
      value: relativeTime(latestUpdate, "No stock updates"),
      icon: Clock3,
    },
    {
      label: `Stock cost value (${currency})`,
      value: formatPreferredCurrency(stockCost, currency, currencyRates),
      icon: DollarSign,
    },
  ];

  return (
    <section
      className={styles.footer}
      aria-label="Inventory and orders summary"
    >
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
