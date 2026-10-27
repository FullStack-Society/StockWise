import type { LucideIcon } from "lucide-react";

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

export type InventoryStat = {
  label: string;
  value: string;
  icon: LucideIcon;
};

/** Product as the UI uses it (camelCase). The API sends snake_case; see lib/api/normalize.ts. */
export type Product = {
  id: number;
  name: string;
  sku: string;
  categoryId: number | null;
  categoryName: string | null;
  description: string | null;
  price: number;
  quantity: number;
  minimumStock: number;
  status: StockStatus;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type Category = { id: number; name: string };

/** What the Add / Edit form sends to the API. */
export type ProductInput = {
  name: string;
  sku: string;
  categoryId: number | null;
  description: string | null;
  price: number;
  quantity: number;
  minimumStock: number;
};
