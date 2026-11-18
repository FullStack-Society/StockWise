import { z } from "zod";

export const maxInteger = 2_147_483_647;

export const integer = z.number().int();

function decimalValue() {
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
      return (
        decimalPlaces <= 2 &&
        Math.max(0, digits.length - decimalPlaces) + decimalPlaces <= 14
      );
    }, "Input should be a valid decimal with at most 14 digits and 2 decimal places.");
}

export const orderItemSchema = z.object({
  product_id: integer.min(1).max(maxInteger),
  quantity_ordered: integer.min(1).max(maxInteger),
  unit_price: decimalValue(),
});

export const purchaseOrderSchema = z.object({
  notes: z.string().max(1000).nullable().optional(),
  items: z.array(orderItemSchema).min(1).max(100),
});

export const receiptSchema = z.object({
  quantity: integer.min(1).max(maxInteger),
});

export const listQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? 100 : Number(value)))
    .pipe(integer.min(1).max(200)),
});

export const historyQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? 500 : Number(value)))
    .pipe(integer.min(1).max(500)),
});

export type PurchaseOrderInput = z.input<typeof purchaseOrderSchema>;
export type PurchaseOrder = z.output<typeof purchaseOrderSchema>;

export type ReceiptInput = z.input<typeof receiptSchema>;
export type Receipt = z.output<typeof receiptSchema>;

export type ListQueryInput = z.input<typeof listQuerySchema>;
export type ListQuery = z.output<typeof listQuerySchema>;

export type HistoryQueryInput = z.input<typeof historyQuerySchema>;
export type HistoryQuery = z.output<typeof historyQuerySchema>;
