import { AlertTriangle, Ban, Boxes } from "lucide-react";
import type { DashboardStat } from "./types";
import type { Product } from "@/lib/inventory/types";
import { ROUTES } from "@/lib/routes";

export function buildDashboardStats(
  products: Product[],
  location: { id: number; name: string },
): DashboardStat[] {
  const units = products.reduce((sum, product) => sum + product.quantity, 0);
  const lowStock = products.filter(
    (product) => product.status === "low-stock",
  ).length;
  const critical = products.filter(
    (product) => product.status === "out-of-stock",
  ).length;
  const locationQuery = `location=${location.id}`;

  return [
    {
      label: "Total stock",
      value: units.toLocaleString(),
      note: `Units at ${location.name}`,
      icon: Boxes,
      href: `${ROUTES.inventory}?${locationQuery}`,
    },
    {
      label: "Low stock items",
      value: lowStock.toLocaleString(),
      note: `At ${location.name}`,
      icon: AlertTriangle,
      href: `${ROUTES.inventory}?${locationQuery}&status=low-stock`,
    },
    {
      label: "Critical",
      value: critical.toLocaleString(),
      note: `No stock at ${location.name}`,
      icon: Ban,
      href: `${ROUTES.inventory}?${locationQuery}&status=out-of-stock`,
    },
  ];
}
