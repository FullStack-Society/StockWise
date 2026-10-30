import type { LucideIcon } from "lucide-react";

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

export type InventoryStat = {
  label: string;
  value: string;
  icon: LucideIcon;
};

export type Product = {
  id: number;
  name: string;
  sku: string;
  categoryId: number | null;
  categoryName: string | null;
  description: string | null;
  price: number;
  quantity: number;
  status: StockStatus;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type Category = { id: number; name: string };

export type ProductInput = {
  name: string;
  sku: string;
  categoryId: number | null;
  description: string | null;
  price: number;
  quantity: number;
};

export type InventoryImportRow = { row: number; product: ProductInput };
