import {
  historyQuerySchema,
  maxInteger,
  listQuerySchema,
  purchaseOrderSchema,
  receiptSchema,
} from "../schemas/purchase-orders.schema.js";
import {
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import type { Pool, PoolClient } from "pg";
import type { AppConfig } from "../config/app-config.js";
import { HttpError } from "../middlewares/error-handler.js";
import { requireOrganizationMembership } from "../middlewares/security.js";
import type {
  PurchaseOrder as PurchaseOrderModel,
  PurchaseOrderRow,
} from "../models/purchase-orders.js";
import { parseAt } from "../utils/parse-schema.js";

function organizationId(req: Request): number {
  return req.organization!.organizationId;
}

function actorEmail(req: Request): string {
  return req.organization!.email;
}

function positivePathInteger(
  req: Request,
  res: Response,
  name: string,
): number | undefined {
  const rawValue = req.params[name];
  const value = typeof rawValue === "string" ? rawValue : "";
  if (!/^[+-]?\d+$/.test(value)) {
    res.status(422).json({
      detail: [
        {
          loc: ["path", name],
          msg: "Input should be a valid integer, unable to parse string as an integer",
          type: "int_parsing",
        },
      ],
    });
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    res.status(422).json({
      detail: [
        {
          loc: ["path", name],
          msg: "Input should be a valid integer",
          type: "int_type",
        },
      ],
    });
    return undefined;
  }
  if (parsed <= 0) {
    res.status(422).json({
      detail: [
        {
          loc: ["path", name],
          msg: "Input should be greater than 0",
          type: "greater_than",
        },
      ],
    });
    return undefined;
  }
  if (parsed > maxInteger) {
    res.status(422).json({
      detail: [
        {
          loc: ["path", name],
          msg: `Input should be less than or equal to ${maxInteger}`,
          type: "less_than_equal",
        },
      ],
    });
    return undefined;
  }
  return parsed;
}

function pgState(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return String((error as { code?: unknown }).code ?? "");
}

function dbMessage(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return undefined;
  }
  return String((error as { message?: unknown }).message ?? "");
}

function purchaseOrderError(
  error: unknown,
  operationMessage: string,
): HttpError {
  if (error instanceof HttpError) return error;
  const state = pgState(error);
  if (state === "P0002") {
    return new HttpError(404, "Purchase order or product was not found.");
  }
  if (state === "22023") {
    return new HttpError(409, dbMessage(error) || operationMessage);
  }
  if (state === "42501") {
    return new HttpError(
      409,
      "You are not allowed to perform this purchase order action.",
    );
  }
  if (state?.startsWith("23")) {
    return new HttpError(
      409,
      "The purchase order references invalid or duplicate products.",
    );
  }
  return new HttpError(503, operationMessage);
}

async function inTransaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let begun = false;
  try {
    await client.query("BEGIN");
    begun = true;
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    if (begun) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original database error.
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

function groupOrders(rows: PurchaseOrderRow[]) {
  const grouped = new Map<number, PurchaseOrderModel>();
  for (const row of rows) {
    const orderId = Number(row.order_id);
    let order = grouped.get(orderId);
    if (!order) {
      order = {
        order_id: orderId,
        order_number: Number(row.order_number),
        notes: row.notes,
        created_by_email: row.created_by_email,
        created_at: row.created_at,
        status: row.status,
        items: [],
      };
      grouped.set(orderId, order);
    }
    const ordered = Number(row.quantity_ordered);
    const received = Number(row.quantity_received);
    order.items.push({
      item_id: Number(row.item_id),
      product_id: Number(row.product_id),
      product_name: row.product_name,
      sku: row.sku,
      quantity_ordered: ordered,
      unit_price: Number(Number(row.unit_price).toFixed(2)),
      quantity_received: received,
      quantity_remaining: ordered - received,
    });
  }
  return [...grouped.values()];
}

async function queryOrder(
  client: Pool | PoolClient,
  orgId: number,
  orderId: number | null,
  limit: number,
) {
  const result = await client.query<PurchaseOrderRow>(
    `SELECT *
       FROM public.stockwise_get_purchase_orders($1, $2, $3)`,
    [orgId, orderId, limit],
  );
  return groupOrders(result.rows);
}

export function createPurchaseOrdersController(pool: Pool, config: AppConfig): Record<string, RequestHandler[]> {
  const handlers: Record<string, RequestHandler[]> = {};
  handlers["USE 1"] = [requireOrganizationMembership(pool, config)];

  handlers["GET /"] = [async (req, res) => {
    const query = parseAt(listQuerySchema, req.query, "query", res);
    if (!query) return;
    try {
      const orders = await queryOrder(
        pool,
        organizationId(req),
        null,
        query.limit,
      );
      res.json(orders);
    } catch (error) {
      throw purchaseOrderError(error, "Unable to retrieve purchase orders.");
    }
  }];

  handlers["GET /history"] = [async (req, res) => {
    const query = parseAt(historyQuerySchema, req.query, "query", res);
    if (!query) return;
    try {
      const result = await pool.query(
        `SELECT *
           FROM public.stockwise_get_purchase_order_history($1, $2)`,
        [organizationId(req), query.limit],
      );
      res.json(
        result.rows.map((row) => ({
          ...row,
          event_id: Number(row.event_id),
          order_id: Number(row.order_id),
          order_number: Number(row.order_number),
        })),
      );
    } catch (error) {
      throw purchaseOrderError(
        error,
        "Unable to retrieve purchase order history.",
      );
    }
  }];

  handlers["POST /"] = [async (req, res) => {
    const body = purchaseOrderSchema.parse(req.body);
    const items = body.items.map((item) => ({
      product_id: item.product_id,
      quantity_ordered: item.quantity_ordered,
      unit_price: Number(item.unit_price),
    }));
    try {
      const order = await inTransaction(pool, async (client) => {
        const created = await client.query(
          `CALL public.stockwise_create_purchase_order_write(
             $1, $2, $3, $4::jsonb, NULL
           )`,
          [
            organizationId(req),
            actorEmail(req),
            body.notes ?? null,
            JSON.stringify(items),
          ],
        );
        const orders = await queryOrder(
          client,
          organizationId(req),
          Number(created.rows[0]?.o_order_id),
          1,
        );
        if (!orders.length) {
          throw new HttpError(
            503,
            "The purchase order was created but could not be retrieved.",
          );
        }
        return orders[0];
      });
      res.status(201).json(order);
    } catch (error) {
      throw purchaseOrderError(error, "Unable to create the purchase order.");
    }
  }];

  handlers["PUT /:order_id"] = [async (req, res) => {
    const orderId = positivePathInteger(req, res, "order_id");
    if (orderId === undefined) return;
    const body = purchaseOrderSchema.parse(req.body);
    const items = body.items.map((item) => ({
      product_id: item.product_id,
      quantity_ordered: item.quantity_ordered,
      unit_price: Number(item.unit_price),
    }));
    try {
      const order = await inTransaction(pool, async (client) => {
        await client.query(
          `CALL public.stockwise_update_purchase_order_write($1, $2, $3, $4, $5::jsonb)`,
          [
            organizationId(req),
            actorEmail(req),
            orderId,
            body.notes ?? null,
            JSON.stringify(items),
          ],
        );
        const orders = await queryOrder(
          client,
          organizationId(req),
          orderId,
          1,
        );
        if (!orders.length) {
          throw new HttpError(404, "Purchase order was not found.");
        }
        return orders[0];
      });
      res.json(order);
    } catch (error) {
      throw purchaseOrderError(error, "Unable to update the purchase order.");
    }
  }];

  handlers["DELETE /:order_id"] = [async (req, res) => {
    const orderId = positivePathInteger(req, res, "order_id");
    if (orderId === undefined) return;
    try {
      await inTransaction(pool, async (client) => {
        await client.query(
          `CALL public.stockwise_delete_purchase_order_write($1, $2, $3)`,
          [organizationId(req), actorEmail(req), orderId],
        );
      });
      res.status(204).end();
    } catch (error) {
      throw purchaseOrderError(error, "Unable to delete the purchase order.");
    }
  }];

  handlers["POST /:order_id/items/:item_id/receive"] = [async (req, res) => {
    const orderId = positivePathInteger(req, res, "order_id");
    if (orderId === undefined) return;
    const itemId = positivePathInteger(req, res, "item_id");
    if (itemId === undefined) return;
    const body = receiptSchema.parse(req.body);
    try {
      const order = await inTransaction(pool, async (client) => {
        await client.query(
          `CALL public.stockwise_receive_purchase_order_item_write($1, $2, $3, $4, $5)`,
          [
            organizationId(req),
            actorEmail(req),
            orderId,
            itemId,
            body.quantity,
          ],
        );
        const orders = await queryOrder(
          client,
          organizationId(req),
          orderId,
          1,
        );
        if (!orders.length) {
          throw new HttpError(404, "Purchase order was not found.");
        }
        return orders[0];
      });
      res.json(order);
    } catch (error) {
      throw purchaseOrderError(
        error,
        "Unable to receive the purchase order item.",
      );
    }
  }];

  return handlers;

}