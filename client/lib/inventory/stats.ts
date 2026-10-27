import {
  AlertTriangle,
  Boxes,
  Clock,
  DollarSign,
  Package,
} from "lucide-react";
import type { DashboardStat } from "@/lib/dashboard/types";
import type { InventoryStat, Product } from "./types";

const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
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

/** The bottom row on the Inventory page, calculated from the real product list. */
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

export function buildDashboardStats(products: Product[]): DashboardStat[] {
  const units = products.reduce((sum, product) => sum + product.quantity, 0);
  const value = products.reduce(
    (sum, product) => sum + product.quantity * product.price,
    0,
  );

  return [
    {
      label: "Products tracked",
      value: products.length.toLocaleString(),
      note: "Live inventory records",
      icon: Package,
    },
    {
      label: "Units on hand",
      value: units.toLocaleString(),
      note: "Across all products",
      icon: Boxes,
    },
    {
      label: "Inventory value",
      value: currency.format(value),
      note: "Quantity multiplied by unit price",
      icon: DollarSign,
    },
  ];
}
