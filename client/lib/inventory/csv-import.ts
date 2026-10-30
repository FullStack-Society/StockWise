import type { Category, InventoryImportRow, ProductInput } from "./types";

export type ParseResult = {
  rows: InventoryImportRow[];
  issues: Array<{ row: number; error: string }>;
};

function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (quoted) throw new Error("The CSV has an unfinished quoted field.");
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function normalizedHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function parseProducts(csv: string, categories: Category[]): ParseResult {
  const records = parseCsv(csv);
  if (records.length < 2)
    throw new Error(
      "This CSV has no product rows. Add at least one product beneath the header row before importing.",
    );

  const headers = records[0].map(normalizedHeader);
  const find = (...names: string[]) =>
    headers.findIndex((header) => names.includes(header));
  const columns = {
    name: find("name", "productname"),
    sku: find("sku", "itemcode"),
    category: find("category", "categoryname", "categoryid"),
    description: find("description", "details"),
    price: find("price", "unitprice"),
    quantity: find("quantity", "stock", "currentstock"),
  };
  if (columns.name < 0 || columns.sku < 0) {
    throw new Error("The CSV needs Product Name (or Name) and SKU columns.");
  }

  const get = (record: string[], index: number) =>
    index < 0 ? "" : (record[index] ?? "").trim();
  const rows: InventoryImportRow[] = [];
  const issues: ParseResult["issues"] = [];
  const seenSkus = new Set<string>();

  for (let index = 1; index < records.length; index++) {
    const record = records[index];
    const rowNumber = index + 1;
    const name = get(record, columns.name);
    const sku = get(record, columns.sku);
    const categoryRaw = get(record, columns.category);
    const description = get(record, columns.description);
    const priceRaw = get(record, columns.price) || "0";
    const quantityRaw = get(record, columns.quantity) || "0";
    const errors: string[] = [];

    if (!name) errors.push("product name is required");
    else if (name.length > 200)
      errors.push("product name exceeds 200 characters");
    if (!sku) errors.push("SKU is required");
    else if (sku.length > 100) errors.push("SKU exceeds 100 characters");
    if (description.length > 1000)
      errors.push("description exceeds 1,000 characters");
    if (!/^\d+(\.\d{1,2})?$/.test(priceRaw))
      errors.push("price must be a non-negative number with up to 2 decimals");
    if (!/^\d+$/.test(quantityRaw))
      errors.push("quantity must be a whole number of 0 or more");

    let categoryId: number | null = null;
    if (categoryRaw) {
      const matched = /^\d+$/.test(categoryRaw)
        ? categories.find((category) => category.id === Number(categoryRaw))
        : categories.find(
            (category) =>
              category.name.toLowerCase() === categoryRaw.toLowerCase(),
          );
      if (!matched)
        errors.push(
          `category "${categoryRaw}" was not found in this organization`,
        );
      else categoryId = matched.id;
    }

    const skuKey = sku.toLowerCase();
    if (sku && seenSkus.has(skuKey))
      errors.push("SKU is duplicated in this file");
    if (sku) seenSkus.add(skuKey);

    const price = Number(priceRaw);
    const quantity = Number(quantityRaw);
    if (quantity > 2_147_483_647) errors.push("quantity is too large");
    if (errors.length) {
      issues.push({ row: rowNumber, error: errors.join("; ") });
      continue;
    }

    const product: ProductInput = {
      name,
      sku,
      categoryId,
      description: description || null,
      price,
      quantity,
    };
    rows.push({ row: rowNumber, product });
  }

  return { rows, issues };
}
