import { Clock3, Package, ShoppingCart } from "lucide-react";
import type { PurchaseOrder } from "@/lib/api/orders";
import type { InventoryStat } from "@/lib/inventory/types";

function relativeTime(timestamp: number | null): string {
  if (timestamp === null) return "No orders yet";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function buildPurchaseOrderStats(orders: PurchaseOrder[]): InventoryStat[] {
  const latestOrder = orders.reduce<number | null>((latest, order) => {
    const timestamp = Date.parse(order.createdAt);
    return Number.isNaN(timestamp) || (latest !== null && timestamp <= latest)
      ? latest
      : timestamp;
  }, null);

  return [
    {
      label: "Orders tracked",
      value: orders.length.toLocaleString(),
      icon: ShoppingCart,
    },
    {
      label: "Open orders",
      value: orders
        .filter((order) => order.status !== "Received")
        .length.toLocaleString(),
      icon: Package,
    },
    {
      label: "Last order placed",
      value: relativeTime(latestOrder),
      icon: Clock3,
    },
  ];
}
