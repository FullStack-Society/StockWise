// Sample data for the Reports page. Replace with API/database calls later.

export type ReportStat = {
  id: string;
  label: string;
  value: string;
  change: string; // e.g. "+12.5% from last month"
  trend: "up" | "down";
  icon: "revenue" | "avg" | "units" | "roi";
};

export const reportStats: ReportStat[] = [
  {
    id: "revenue",
    label: "Total Revenue",
    value: "$245,890.00",
    change: "+12.5% from last month",
    trend: "up",
    icon: "revenue",
  },
  {
    id: "avg",
    label: "Avg. Sale Value",
    value: "$124.50",
    change: "+3.2% from last month",
    trend: "up",
    icon: "avg",
  },
  {
    id: "units",
    label: "Units Sold",
    value: "1,842",
    change: "-0.8% from last month",
    trend: "down",
    icon: "units",
  },
  {
    id: "roi",
    label: "Inventory ROI",
    value: "18.4%",
    change: "+2.1% from last month",
    trend: "up",
    icon: "roi",
  },
];

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Values in dollars (estimated by eye from the Figma chart).
export const revenueSeries = [
  30000, 36000, 34000, 42000, 40000, 48000, 52000, 56000, 62000, 66000, 74000,
  85000,
];
export const profitSeries = [
  22000, 27000, 26000, 32000, 31000, 36000, 40000, 42000, 46000, 50000, 54000,
  60000,
];

export type CategoryShareItem = {
  id: string;
  label: string;
  percent: number;
  color: string;
};

export const categoryShare: CategoryShareItem[] = [
  { id: "apparel", label: "Apparel", percent: 42, color: "#c8641f" },
  { id: "footwear", label: "Footwear", percent: 28, color: "#f6ead8" },
  { id: "accessories", label: "Accessories", percent: 15, color: "#e0d2bd" },
  { id: "other", label: "Other", percent: 15, color: "#8a5a3c" },
];

export type TopProduct = {
  id: string;
  name: string;
  unitsSold: number;
  health: "Optimal" | "Reorder";
  totalSales: number;
  trend: "up" | "down";
};

export const topProducts: TopProduct[] = [
  {
    id: "p1",
    name: "Premium Leather Boots",
    unitsSold: 1240,
    health: "Optimal",
    totalSales: 110360,
    trend: "up",
  },
  {
    id: "p2",
    name: "Cotton Crew T-Shirt",
    unitsSold: 842,
    health: "Reorder",
    totalSales: 20629,
    trend: "down",
  },
  {
    id: "p3",
    name: "Wool Knit Sweater",
    unitsSold: 520,
    health: "Optimal",
    totalSales: 28600,
    trend: "up",
  },
];

export const reportFooterStats = [
  {
    id: "sync",
    label: "Report Generation",
    value: "Auto-Sync ON",
    icon: "search" as const,
  },
  {
    id: "accuracy",
    label: "Data Accuracy",
    value: "99.9% Verified",
    icon: "eye" as const,
  },
  {
    id: "insights",
    label: "Insights Alert",
    value: "2 New Trends",
    icon: "bulb" as const,
  },
];
