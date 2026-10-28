import type { Product } from "./types";

const HEADERS = [
  "Product Name",
  "SKU",
  "Category",
  "Description",
  "Price",
  "Quantity",
  "Minimum Stock",
];

function escapeCsv(value: string | number | null): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function exportProductsCsv(products: Product[]): string {
  const rows = [
    HEADERS,
    ...products.map((product) => [
      product.name,
      product.sku,
      product.categoryName,
      product.description,
      product.price.toFixed(2),
      product.quantity,
      product.minimumStock,
    ]),
  ];

  return rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}
