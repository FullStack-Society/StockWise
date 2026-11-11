import { z } from "zod";

export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const saleSchema = z.object({
  sale_id: z.string().regex(uuidPattern),
  payment_method: z.enum(["cash", "card", "qr"]),
  items: z
    .array(
      z.object({
        product_id: z.number().int().positive().max(2_147_483_647),
        quantity: z.number().int().positive().max(2_147_483_647),
      }),
    )
    .min(1)
    .max(100),
});

export const merchantQrSchema = z.object({
  image_data: z
    .string()
    .min(32)
    .max(2_100_000)
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/),
});

export type SaleInput = z.input<typeof saleSchema>;
export type Sale = z.output<typeof saleSchema>;

export type MerchantQrInput = z.input<typeof merchantQrSchema>;
export type MerchantQr = z.output<typeof merchantQrSchema>;
