import {
  AlertTriangle,
  Ban,
  Boxes,
  Clock,
  DollarSign,
} from "lucide-react";
import type { DashboardStat } from "@/lib/dashboard/types";
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
  const lowStock = products.filter((product) => product.status === "low-stock").length;
  const critical = products.filter((product) => product.status === "out-of-stock").length;

  return [
    {
      label: "Total stock",
      value: units.toLocaleString(),
      note: "Units across all products",
      icon: Boxes,
      href: "/pages/inventory",
    },
    {
      label: "Low stock items",
      value: lowStock.toLocaleString(),
      note: "Requires attention",
      icon: AlertTriangle,
      href: "/pages/inventory?status=low-stock",
    },
    {
      label: "Critical",
      value: critical.toLocaleString(),
      note: "At or below 25 units",
      icon: Ban,
      href: "/pages/inventory?status=out-of-stock",
    },
  ];
}
