import {
  AlertTriangle,
  Ban,
  DollarSign,
  Eye,
  Lock,
  Mail,
  Package,
  type LucideIcon,
} from "lucide-react";

export type Stat = {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
};

export const STATS: Stat[] = [
  {
    label: "Total stock",
    value: "14,284",
    note: "+12% from last month",
    icon: Package,
  },
  {
    label: "Low stock items",
    value: "28",
    note: "Requires attention",
    icon: AlertTriangle,
  },
  {
    label: "Pending orders",
    value: "156",
    note: "Processing scheduled",
    icon: Ban,
  },
];

export type StockStatus = "in-stock" | "low-stock" | "critical";

export type InventoryRow = {
  name: string;
  sku: string;
  category: string;
  level: number;
  status: StockStatus;
};

export const RECENT_INVENTORY: InventoryRow[] = [
  {
    name: "Premium Leather Boots",
    sku: "SHOE-PLB-001",
    category: "Footwear",
    level: 120,
    status: "in-stock",
  },
  {
    name: "Cotton Crew T-Shirt",
    sku: "APPA-CCT-042",
    category: "Apparel",
    level: 12,
    status: "low-stock",
  },
  {
    name: "Wool Knit Sweater",
    sku: "APPA-WKS-019",
    category: "Apparel",
    level: 85,
    status: "in-stock",
  },
  {
    name: "Denim Jacket V2",
    sku: "APPA-DJV-008",
    category: "Apparel",
    level: 45,
    status: "in-stock",
  },
  {
    name: "Canvas Backpack",
    sku: "ACCE-CB-015",
    category: "Accessories",
    level: 5,
    status: "critical",
  },
];

export const STATUS_LABEL: Record<StockStatus, string> = {
  "in-stock": "In stock",
  "low-stock": "Low stock",
  critical: "Critical",
};

export const FLOW_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const FLOW_INCOMING = [380, 590, 530, 690, 640, 810, 740];
export const FLOW_OUTGOING = [330, 390, 440, 480, 450, 600, 560];

export const ALERTS = [
  {
    text: "Supplier 'Zenith Corp' delayed shipment.",
    tone: "warning" as const,
  },
  { text: "Monthly audit report ready for review.", tone: "info" as const },
];

export type QuickStat = { label: string; value: string; icon: LucideIcon };

export const QUICK_STATS: QuickStat[] = [
  { label: "Suppliers active", value: "142", icon: Mail },
  { label: "Warehouse space", value: "84% Full", icon: Lock },
  { label: "Last inventory sync", value: "4 mins ago", icon: Eye },
  { label: "Valuation (USD)", value: "$1.2M", icon: DollarSign },
];
