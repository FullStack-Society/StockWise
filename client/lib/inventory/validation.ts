import type { ProductInput } from "./types";

const INT_MAX = 2_147_483_647; // PostgreSQL integer limit

export type ParsedProductForm =
  | { ok: true; id: number | null; values: ProductInput }
  | { ok: false; errors: Record<string, string> };

/** Server-side validation of the Add / Edit form. Field names match the form inputs. */
export function parseProductForm(fd: FormData): ParsedProductForm {
  const text = (key: string) => String(fd.get(key) ?? "").trim();
  const errors: Record<string, string> = {};

  const name = text("name");
  if (!name) errors.name = "Product name is required.";
  else if (name.length > 200) errors.name = "Use 200 characters or fewer.";

  const sku = text("sku");
  if (!sku) errors.sku = "SKU is required.";
  else if (sku.length > 100) errors.sku = "Use 100 characters or fewer.";

  const description = text("description");
  if (description.length > 1000)
    errors.description = "Use 1,000 characters or fewer.";

  const priceText = text("price");
  if (!/^\d+(\.\d{1,2})?$/.test(priceText))
    errors.price = "Enter a price like 25 or 25.50.";
  const price = Number(priceText);

  const parseInt0 = (key: string, message: string) => {
    const raw = text(key);
    const n = Number(raw);
    if (!/^\d+$/.test(raw) || n > INT_MAX) {
      errors[key] = message;
      return 0;
    }
    return n;
  };
  const quantity = parseInt0("quantity", "Enter a whole number, 0 or more.");
  const minimumStock = parseInt0(
    "minimumStock",
    "Enter a whole number, 0 or more.",
  );

  const categoryRaw = text("categoryId");
  let categoryId: number | null = null;
  if (categoryRaw) {
    if (/^\d+$/.test(categoryRaw)) categoryId = Number(categoryRaw);
    else errors.categoryId = "Choose a valid category.";
  }

  const idRaw = text("id");
  const id = /^\d+$/.test(idRaw) ? Number(idRaw) : null;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    id,
    values: {
      name,
      sku,
      categoryId,
      description: description || null,
      price,
      quantity,
      minimumStock,
    },
  };
}
