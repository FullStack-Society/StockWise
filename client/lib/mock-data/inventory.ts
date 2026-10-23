import { Eye, Lock, DollarSign, type LucideIcon } from "lucide-react";

export type StockStatus =
  | "in-stock"
  | "low-stock"
  | "critical"
  | "out-of-stock";

export type Product = {
  id: string;
  name: string;
  barcode: string;
  category: string;
  quantity: number;
  price: number;
  supplier: string;
};

/** Status is derived from quantity so it can never get out of sync. */
export function getStatus(quantity: number): StockStatus {
  if (quantity <= 0) return "out-of-stock";
  if (quantity <= 5) return "critical";
  if (quantity <= 20) return "low-stock";
  return "in-stock";
}

export const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Premium Leather Boots",
    barcode: "0000000000001",
    category: "Footwear",
    quantity: 120,
    price: 89,
    supplier: "Urban Soles Co.",
  },
  {
    id: "2",
    name: "Cotton Crew T-Shirt",
    barcode: "0000000000042",
    category: "Apparel",
    quantity: 12,
    price: 24.5,
    supplier: "Threadline Textiles",
  },
  {
    id: "3",
    name: "Wool Knit Sweater",
    barcode: "0000000000019",
    category: "Apparel",
    quantity: 85,
    price: 55,
    supplier: "Nordic Knits",
  },
  {
    id: "4",
    name: "Canvas Backpack",
    barcode: "0000000000015",
    category: "Accessories",
    quantity: 5,
    price: 45,
    supplier: "Trailpack Supply",
  },
  {
    id: "5",
    name: "Denim Jacket V2",
    barcode: "0000000000008",
    category: "Apparel",
    quantity: 0,
    price: 110,
    supplier: "Threadline Textiles",
  },
  {
    id: "6",
    name: "Running Sneakers X",
    barcode: "0000000000023",
    category: "Footwear",
    quantity: 64,
    price: 129,
    supplier: "Urban Soles Co.",
  },
  {
    id: "7",
    name: "Leather Belt Classic",
    barcode: "0000000000031",
    category: "Accessories",
    quantity: 18,
    price: 32,
    supplier: "Trailpack Supply",
  },
  {
    id: "8",
    name: "Merino Wool Socks (3-pack)",
    barcode: "0000000000044",
    category: "Apparel",
    quantity: 210,
    price: 18,
    supplier: "Nordic Knits",
  },
  {
    id: "9",
    name: "Waterproof Rain Jacket",
    barcode: "0000000000052",
    category: "Apparel",
    quantity: 3,
    price: 98,
    supplier: "Trailpack Supply",
  },
  {
    id: "10",
    name: "Suede Chelsea Boots",
    barcode: "0000000000057",
    category: "Footwear",
    quantity: 27,
    price: 140,
    supplier: "Urban Soles Co.",
  },
  {
    id: "11",
    name: "Canvas Tote Bag",
    barcode: "0000000000061",
    category: "Accessories",
    quantity: 0,
    price: 22,
    supplier: "Trailpack Supply",
  },
  {
    id: "12",
    name: "Linen Button Shirt",
    barcode: "0000000000066",
    category: "Apparel",
    quantity: 76,
    price: 48,
    supplier: "Threadline Textiles",
  },
];

export const CATEGORIES = ["Footwear", "Apparel", "Accessories"];
export const SUPPLIERS = [
  "Urban Soles Co.",
  "Threadline Textiles",
  "Nordic Knits",
  "Trailpack Supply",
];
export const STATUS_OPTIONS: { value: StockStatus; label: string }[] = [
  { value: "in-stock", label: "In stock" },
  { value: "low-stock", label: "Low stock" },
  { value: "critical", label: "Critical" },
  { value: "out-of-stock", label: "Out of stock" },
];

export type InventoryStat = { label: string; value: string; icon: LucideIcon };

export const INVENTORY_STATS: InventoryStat[] = [
  { label: "Warehouse capacity", value: "84% Full", icon: Lock },
  { label: "Last stock sync", value: "4 mins ago", icon: Eye },
  { label: "Total valuation", value: "$1.2M", icon: DollarSign },
];
