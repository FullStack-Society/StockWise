import type { StockStatus } from "./types";

export const PAGE_SIZE = 8;

export const STATUS_OPTIONS: { value: StockStatus; label: string }[] = [
  { value: "in-stock", label: "In stock" },
  { value: "low-stock", label: "Low stock" },
  { value: "out-of-stock", label: "Out of stock" },
];
