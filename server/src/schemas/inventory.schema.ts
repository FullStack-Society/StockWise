import { z } from "zod";

export const maxInteger = 2_147_483_647;

export const integer = z.number().int();

export const nonNegativeInteger = integer.min(0).max(maxInteger);

export const positiveInteger = integer.min(1).max(maxInteger);

function decimalValue(maxDigits = 14) {
  return z
    .union([z.number().finite(), z.string()])
    .transform(String)
    .refine((value) => {
      const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(value);
      if (!match || match[1] === "-") return false;
      const exponent = Number(match[4] ?? 0);
      if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 100) {
        return false;
      }
      const fraction = match[3] ?? "";
      const digits = `${match[2]}${fraction}`.replace(/^0+/, "") || "0";
      const decimalPlaces = Math.max(0, fraction.length - exponent);
      const integerDigits = Math.max(0, digits.length - decimalPlaces);
      return decimalPlaces <= 2 && integerDigits + decimalPlaces <= maxDigits;
    }, "Input should be a valid decimal with at most 14 digits and 2 decimal places.");
}

export const requiredText = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, "This field cannot be blank.");

export const upcSchema = z
  .string()
  .max(12)
  .nullable()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  })
  .refine(
    (value) =>
      value === null || (/^\d{12}$/.test(value) && value.length === 12),
    "UPC-A must contain exactly 12 digits.",
  );

export const createInventorySchema = z.object({
  product_name: requiredText(200),
  sku: requiredText(100),
  upc: upcSchema,
  category_id: positiveInteger.nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  price: decimalValue().default("0"),
  variant: z.string().max(200).nullable().optional(),
  quantity: nonNegativeInteger.default(0),
  reorder_point: nonNegativeInteger.default(50),
});

export const updateInventorySchema = z.object({
  product_name: requiredText(200),
  sku: requiredText(100),
  upc: upcSchema,
  category_id: positiveInteger.nullable(),
  description: z.string().max(2000).nullable(),
  price: decimalValue(),
  variant: z.string().max(200).nullable().optional(),
  quantity: nonNegativeInteger,
  reorder_point: nonNegativeInteger,
});

export const categorySchema = z.object({
  category_name: z
    .string()
    .min(1)
    .max(100)
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, "Category name cannot be blank."),
});

export const stockAdjustmentSchema = z.object({
  transaction_type: z.enum(["OUT", "ADJUST"]),
  quantity: integer.min(-maxInteger).max(maxInteger),
  remarks: z.string().min(1).max(500),
});

export const stocktakeSchema = z.object({
  counted_quantity: nonNegativeInteger,
  remarks: z.string().min(1).max(500),
});

export const inventoryQuerySchema = z.object({
  search: z.string().optional(),
  category_id: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .pipe(positiveInteger.optional()),
  stock_status: z.enum(["In stock", "Low stock", "Critical"]).optional(),
});

export const movementQuerySchema = z.object({
  product_id: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .pipe(positiveInteger.optional()),
  limit: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? 100 : Number(value)))
    .pipe(integer.min(1).max(200)),
});

export type CreateInventoryInput = z.input<typeof createInventorySchema>;
export type CreateInventory = z.output<typeof createInventorySchema>;

export type UpdateInventoryInput = z.input<typeof updateInventorySchema>;
export type UpdateInventory = z.output<typeof updateInventorySchema>;

export type CategoryInput = z.input<typeof categorySchema>;
export type Category = z.output<typeof categorySchema>;

export type StockAdjustmentInput = z.input<typeof stockAdjustmentSchema>;
export type StockAdjustment = z.output<typeof stockAdjustmentSchema>;

export type StocktakeInput = z.input<typeof stocktakeSchema>;
export type Stocktake = z.output<typeof stocktakeSchema>;

export type InventoryQueryInput = z.input<typeof inventoryQuerySchema>;
export type InventoryQuery = z.output<typeof inventoryQuerySchema>;

export type MovementQueryInput = z.input<typeof movementQuerySchema>;
export type MovementQuery = z.output<typeof movementQuerySchema>;
