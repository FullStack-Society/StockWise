import { AlertTriangle, Ban, Boxes } from "lucide-react";
import type { DashboardStat } from "./types";
import type { Product } from "@/lib/inventory/types";
import { ROUTES } from "@/lib/routes";

export function buildDashboardStats(
  products: Product[],
): DashboardStat[] {
  const units = products.reduce((sum, product) => sum + product.quantity, 0);
  const lowStock = products.filter(
    (product) => product.status === "low-stock",
  ).length;
  const critical = products.filter(
    (product) => product.status === "out-of-stock",
  ).length;
  return [
    {
      label: "Total stock",
      value: units.toLocaleString(),
      note: "Units across inventory",
      icon: Boxes,
      href: ROUTES.inventory,
    },
    {
      label: "Low stock items",
      value: lowStock.toLocaleString(),
      note: "Items at or below reorder point",
      icon: AlertTriangle,
      href: `${ROUTES.inventory}?status=low-stock`,
    },
    {
      label: "Critical",
      value: critical.toLocaleString(),
      note: "Items with no stock",
      icon: Ban,
      href: `${ROUTES.inventory}?status=out-of-stock`,
    },
  ];
}
