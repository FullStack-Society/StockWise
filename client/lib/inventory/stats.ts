import { AlertTriangle, Clock, DollarSign } from "lucide-react";
import type { InventoryStat, Product } from "./types";

const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

function relativeTime(timestamp: number | null): string {
  if (timestamp === null) return "No data";
  const minutes = Math.floor((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function buildInventoryStats(products: Product[]): InventoryStat[] {
  const value = products.reduce((sum, p) => sum + p.quantity * p.price, 0);
  const needsRestock = products.filter((p) => p.status !== "in-stock").length;
  const latest = products.reduce<number | null>((max, p) => {
    const t = Date.parse(p.updatedAt);
    return Number.isNaN(t) ? max : max === null || t > max ? t : max;
  }, null);

  return [
    {
      label: "Inventory value",
      value: compactUsd.format(value),
      icon: DollarSign,
    },
    {
      label: "Needs restock",
      value: String(needsRestock),
      icon: AlertTriangle,
    },
    { label: "Last stock update", value: relativeTime(latest), icon: Clock },
  ];
}
