import { saleSchema, merchantQrSchema } from "../schemas/sales.schema.js";
import type { NextFunction, Request, Response } from "express";
import type { Pool } from "pg";
import { HttpError } from "../middlewares/error-handler.js";
import type { SaleItemInput } from "../models/sales.js";

export function createSalesController(pool: Pool) {
  const getMerchantQr = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
      try {
        const { rows } = await pool.query<{ merchant_qr_data: string | null }>(
          `SELECT public.stockwise_get_merchant_qr($1) AS merchant_qr_data`,
          [req.organization!.organizationId],
        );
        res.json({ image_data: rows[0]?.merchant_qr_data ?? null });
      } catch (error) {
        console.error("[StockWise Node API] Merchant QR lookup failed:", error);
        next(
          new HttpError(503, "Unable to load this organization's payment QR."),
        );
      }
  };

  const updateMerchantQr = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
      try {
        const body = merchantQrSchema.parse(req.body);
        const context = req.organization!;
        if (!["owner", "manager"].includes(context.role.toLowerCase())) {
          throw new HttpError(
            403,
            "Only owners and managers can update the merchant payment QR.",
          );
        }
        await pool.query(
          "CALL public.stockwise_set_merchant_qr($1, $2, $3)",
          [context.organizationId, body.image_data, context.email],
        );
        res.status(204).end();
      } catch (error) {
        next(error);
      }
  };

  const checkout = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
      const parsed = saleSchema.safeParse(req.body);
      if (!parsed.success) {
        next(parsed.error);
        return;
      }

      const context = req.organization!;
      const sale = parsed.data;
      const quantities = new Map<number, number>();
      for (const item of sale.items) {
        const quantity = (quantities.get(item.product_id) ?? 0) + item.quantity;
        if (quantity > 2_147_483_647) {
          next(new HttpError(422, "Sale quantity is too large."));
          return;
        }
        quantities.set(item.product_id, quantity);
      }

      const client = await pool.connect().catch(next);
      if (!client) return;
      try {
        await client.query("BEGIN");
        const items: SaleItemInput[] = [...quantities.entries()]
          .map(([product_id, quantity]) => ({ product_id, quantity }))
          .sort((a, b) => a.product_id - b.product_id);
        const result = await client.query<{ p_items_sold: number }>(
          "CALL public.stockwise_record_sale($1, $2, $3::uuid, $4, $5::jsonb, NULL)",
          [
            context.organizationId,
            context.email,
            sale.sale_id,
            sale.payment_method,
            JSON.stringify(items),
          ],
        );
        await client.query("COMMIT");
        res.status(201).json({
          sale_id: sale.sale_id,
          items_sold: Number(result.rows[0]?.p_items_sold ?? 0),
        });
      } catch (error) {
        await client.query("ROLLBACK").catch((rollbackError: unknown) => {
          console.error(
            "[StockWise Node API] Sale rollback failed:",
            rollbackError,
          );
        });
        if (error instanceof HttpError) {
          next(error);
          return;
        }
        const code =
          typeof error === "object" && error !== null && "code" in error
            ? String(error.code)
            : "";

        if (code === "23505") {
          next(
            new HttpError(
              409,
              "One or more products are no longer available in the requested quantity.",
            ),
          );
          return;
        }
        if (code === "P0002") {
          next(new HttpError(404, "A product in this sale no longer exists."));
          return;
        }
        if (code === "22023") {
          const detail =
            typeof error === "object" && error !== null && "message" in error
              ? String(error.message)
              : "";
          next(
            new HttpError(
              409,
              detail ||
                "Stock changed before checkout. Review the cart and try again.",
            ),
          );
          return;
        }
        if (code === "42501") {
          next(new HttpError(403, "You are not allowed to record this sale."));
          return;
        }
        console.error("[StockWise Node API] Sale checkout failed:", error);
        next(
          new HttpError(
            503,
            "Unable to complete this sale. No stock was changed.",
          ),
        );
      } finally {
        client.release();
      }
  };

  return { getMerchantQr, updateMerchantQr, checkout };
}
