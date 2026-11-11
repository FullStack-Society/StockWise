import {
  categorySchema,
  createInventorySchema,
  inventoryQuerySchema,
  maxInteger,
  movementQuerySchema,
  stockAdjustmentSchema,
  stocktakeSchema,
  updateInventorySchema,
} from "../schemas/inventory.schema.js";
import { type Request, type Response, type RequestHandler } from "express";
import type {
  Pool,
  PoolClient,
} from "pg";
import type { AppConfig } from "../config/app-config.js";
import { HttpError } from "../middlewares/error-handler.js";
import { requireOrganizationMembership } from "../middlewares/security.js";
import type { InventoryRecord } from "../models/inventory.js";
import { parseAt } from "../utils/parse-schema.js";

function organizationId(req: Request): number {
  return req.organization!.organizationId;
}

function integerPath(
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
  return parsed;
}

function asNumber(value: unknown): number {
  return Number(value);
}

function inventoryRow(row: InventoryRecord) {
  return {
    ...row,
    product_id: asNumber(row.product_id),
    category_id:
      row.category_id === null || row.category_id === undefined
        ? null
        : asNumber(row.category_id),
    price: asNumber(row.price),
    quantity: asNumber(row.quantity),
    reorder_point: asNumber(row.reorder_point),
  };
}

async function enrichProduct(
  client: Pool | PoolClient,
  orgId: number,
  row: InventoryRecord,
) {
  const { rows } = await client.query(
    `SELECT *
       FROM public.stockwise_get_inventory_product_details($1, $2::integer[])`,
    [orgId, [asNumber(row.product_id)]],
  );
  return inventoryRow({ ...row, ...(rows[0] ?? {}) });
}

async function enrichProducts(
  pool: Pool | PoolClient,
  orgId: number,
  rows: InventoryRecord[],
) {
  if (!rows.length) return rows;
  const ids = rows.map((row) => asNumber(row.product_id));
  const result = await pool.query(
    `SELECT *
       FROM public.stockwise_get_inventory_product_details($1, $2::integer[])`,
    [orgId, ids],
  );
  const details = new Map<number, InventoryRecord>(
    result.rows.map((row) => [asNumber(row.product_id), row]),
  );
  return rows.map((row) =>
    inventoryRow({ ...row, ...(details.get(asNumber(row.product_id)) ?? {}) }),
  );
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

function inventoryError(
  error: unknown,
  operationMessage: string,
  options: {
    notFoundMessage?: string;
    integrityMessage?: string;
    categoryDuplicate?: boolean;
    deleteProduct?: boolean;
    unexpectedStatus?: number;
  } = {},
): HttpError {
  if (error instanceof HttpError) return error;
  const state = pgState(error);
  if (state === "P0002") {
    return new HttpError(
      404,
      options.notFoundMessage ?? "Product was not found.",
    );
  }
  if (state === "22023") {
    const message = dbMessage(error);
    if (
      options.deleteProduct &&
      message ===
        "This product cannot be deleted while a purchase order has quantity remaining"
    ) {
      return new HttpError(
        409,
        "This product cannot be deleted while a purchase order has quantity remaining.",
      );
    }
    return new HttpError(409, message || operationMessage);
  }
  if (state === "42501") {
    return new HttpError(
      409,
      "You are not allowed to perform this inventory action.",
    );
  }
  if (state?.startsWith("23")) {
    if (options.categoryDuplicate) {
      return new HttpError(409, "A category with this name already exists.");
    }
    if (options.integrityMessage) {
      const constraint = (error as { constraint?: string }).constraint;
      return new HttpError(
        409,
        constraint === "products_organization_upc_unique_idx"
          ? "A product with this UPC already exists in the organization."
          : options.integrityMessage,
      );
    }
  }
  return new HttpError(options.unexpectedStatus ?? 503, operationMessage);
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

export function createInventoryController(pool: Pool, config: AppConfig): Record<string, RequestHandler[]> {
  const handlers: Record<string, RequestHandler[]> = {};
  handlers["USE 1"] = [requireOrganizationMembership(pool, config)];

  handlers["GET /movements"] = [async (req, res) => {
    const query = parseAt(movementQuerySchema, req.query, "query", res);
    if (!query) return;
    try {
      const result = await pool.query(
        `SELECT *
           FROM public.stockwise_get_inventory_history($1, $2, $3)`,
        [organizationId(req), query.product_id ?? null, query.limit],
      );
      res.json(
        result.rows.map((row) => ({
          ...row,
          movement_id: asNumber(row.movement_id),
          product_id: asNumber(row.product_id),
          quantity: asNumber(row.quantity),
          expected_quantity:
            row.expected_quantity === null
              ? null
              : asNumber(row.expected_quantity),
          counted_quantity:
            row.counted_quantity === null
              ? null
              : asNumber(row.counted_quantity),
        })),
      );
    } catch (error) {
      throw inventoryError(error, "Unable to retrieve inventory history.");
    }
  }];

  handlers["GET /"] = [async (req, res) => {
    const query = parseAt(inventoryQuerySchema, req.query, "query", res);
    if (!query) return;
    try {
      const result = await pool.query(
        `SELECT *
           FROM public.organization_get_inventory($1, $2, $3, $4)`,
        [
          organizationId(req),
          query.search ?? null,
          query.category_id ?? null,
          query.stock_status ?? null,
        ],
      );
      res.json(await enrichProducts(pool, organizationId(req), result.rows));
    } catch (error) {
      throw inventoryError(error, "Unable to retrieve inventory.");
    }
  }];

  handlers["GET /alerts"] = [async (req, res) => {
    try {
      const rows: InventoryRecord[] = [];
      for (const stockStatus of ["Low stock", "Critical"]) {
        const result = await pool.query(
          `SELECT *
             FROM public.organization_get_inventory($1, NULL, NULL, $2)`,
          [organizationId(req), stockStatus],
        );
        rows.push(...result.rows);
      }
      res.json(await enrichProducts(pool, organizationId(req), rows));
    } catch (error) {
      throw inventoryError(error, "Unable to retrieve inventory.");
    }
  }];

  handlers["GET /categories/"] = [async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM public.organization_get_categories($1)`,
        [organizationId(req)],
      );
      res.json(
        result.rows.map((row) => ({
          ...row,
          category_id: asNumber(row.category_id),
        })),
      );
    } catch (error) {
      throw inventoryError(error, "Unable to retrieve categories.");
    }
  }];

  handlers["POST /categories/"] = [async (req, res) => {
    const body = categorySchema.parse(req.body);
    if (!["owner", "manager"].includes(req.organization!.role.toLowerCase())) {
      throw new HttpError(
        403,
        "Only owners and managers can manage inventory categories.",
      );
    }
    try {
      const result = await pool.query(
        `CALL public.stockwise_create_inventory_category(
           $1, $2, NULL, NULL, NULL
         )`,
        [organizationId(req), body.category_name],
      );
      const row = result.rows[0];
      res.status(201).json({
        category_id: asNumber(row?.o_category_id),
        category_name: row?.o_category_name,
        description: row?.o_description,
      });
    } catch (error) {
      throw inventoryError(error, "Unable to create the category.", {
        categoryDuplicate: true,
      });
    }
  }];

  handlers["DELETE /categories/:category_id"] = [async (req, res) => {
    if (!["owner", "manager"].includes(req.organization!.role.toLowerCase())) {
      throw new HttpError(
        403,
        "Only owners and managers can manage inventory categories.",
      );
    }
    const categoryId = integerPath(req, res, "category_id");
    if (categoryId === undefined) return;
    try {
      const result = await pool.query(
        `CALL public.stockwise_delete_inventory_category($1, $2, NULL)`,
        [organizationId(req), categoryId],
      );
      if (!result.rows[0]?.o_deleted)
        throw new HttpError(404, "Category was not found.");
      res.status(204).end();
    } catch (error) {
      throw inventoryError(error, "Unable to delete the category.", {
        notFoundMessage: "Category was not found.",
      });
    }
  }];

  handlers["GET /:product_id"] = [async (req, res) => {
    const productId = integerPath(req, res, "product_id");
    if (productId === undefined) return;
    try {
      const result = await pool.query(
        `SELECT *
           FROM public.organization_get_inventory_by_id($1, $2)`,
        [organizationId(req), productId],
      );
      const row = result.rows[0] as InventoryRecord | undefined;
      if (!row) {
        throw new HttpError(404, `Inventory item ${productId} was not found.`);
      }
      res.json(await enrichProduct(pool, organizationId(req), row));
    } catch (error) {
      throw inventoryError(error, "Unable to retrieve the inventory item.", {
        notFoundMessage: `Inventory item ${productId} was not found.`,
      });
    }
  }];

  handlers["POST /"] = [async (req, res) => {
    const body = createInventorySchema.parse(req.body);
    try {
      const product = await inTransaction(pool, async (client) => {
        const created = await client.query(
          `CALL public.stockwise_create_inventory(
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL
           )`,
          [
            organizationId(req),
            body.product_name,
            body.sku,
            body.category_id ?? null,
            body.description ?? null,
            body.price,
            body.quantity,
            body.reorder_point,
            req.organization!.email,
            body.variant ?? null,
            body.upc ?? null,
          ],
        );
        const result = await client.query(
          `SELECT *
             FROM public.organization_get_inventory_by_id($1, $2)`,
          [organizationId(req), created.rows[0]?.o_product_id],
        );
        const row = result.rows[0] as InventoryRecord | undefined;
        if (!row) {
          throw new HttpError(503, "Unable to create the inventory item.");
        }
        return enrichProduct(client, organizationId(req), row);
      });
      res.status(201).json(product);
    } catch (error) {
      throw inventoryError(error, "Unable to create the inventory item.", {
        integrityMessage:
          "The product could not be created. Check whether its SKU already exists, and verify its category.",
      });
    }
  }];

  handlers["PUT /:product_id"] = [async (req, res) => {
    const productId = integerPath(req, res, "product_id");
    if (productId === undefined) return;
    const body = updateInventorySchema.parse(req.body);
    const suppliedFields = req.body as InventoryRecord;
    try {
      const product = await inTransaction(pool, async (client) => {
        await client.query(
          `CALL public.stockwise_update_inventory(
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
           )`,
          [
            organizationId(req),
            productId,
            body.product_name,
            body.sku,
            body.category_id,
            body.description,
            body.price,
            body.quantity,
            body.reorder_point,
            Object.hasOwn(suppliedFields, "variant"),
            body.variant ?? null,
            Object.hasOwn(suppliedFields, "upc"),
            body.upc ?? null,
          ],
        );
        const result = await client.query(
          `SELECT *
             FROM public.organization_get_inventory_by_id($1, $2)`,
          [organizationId(req), productId],
        );
        const row = result.rows[0] as InventoryRecord | undefined;
        if (!row) {
          throw new HttpError(
            404,
            `Inventory item ${productId} was not found.`,
          );
        }
        return enrichProduct(client, organizationId(req), row);
      });
      res.json(product);
    } catch (error) {
      throw inventoryError(error, "Unable to update the inventory item.", {
        integrityMessage:
          "The update conflicts with existing data. Check the SKU and category.",
      });
    }
  }];

  handlers["DELETE /:product_id"] = [async (req, res) => {
    const productId = integerPath(req, res, "product_id");
    if (productId === undefined) return;
    try {
      const result = await pool.query(
        `CALL public.stockwise_delete_inventory($1, $2, NULL)`,
        [organizationId(req), productId],
      );
      if (!result.rows[0]?.o_deleted) {
        throw new HttpError(
          404,
          `Inventory item ${productId} was not found or is already deleted.`,
        );
      }
      res.status(204).end();
    } catch (error) {
      throw inventoryError(error, "Unable to delete the inventory item.", {
        notFoundMessage: `Inventory item ${productId} was not found or is already deleted.`,
        deleteProduct: true,
      });
    }
  }];

  handlers["POST /:product_id/movements"] = [async (req, res) => {
    const productId = integerPath(req, res, "product_id");
    if (productId === undefined) return;
    const body = stockAdjustmentSchema.parse(req.body);
    if (
      body.quantity === 0 ||
      (body.transaction_type !== "ADJUST" && body.quantity < 0)
    ) {
      throw new HttpError(
        422,
        "Enter a non-zero adjustment or a positive movement quantity.",
      );
    }
    try {
      const result = await pool.query(
        `CALL public.stockwise_adjust_inventory_stock_write(
           $1, $2, $3, $4, $5, $6, NULL
         )`,
        [
          organizationId(req),
          req.organization!.email,
          productId,
          body.transaction_type,
          body.quantity,
          body.remarks.trim(),
        ],
      );
      res.json({ quantity: asNumber(result.rows[0]?.o_quantity) });
    } catch (error) {
      throw inventoryError(error, "Unable to record the stock movement.");
    }
  }];

  handlers["POST /:product_id/stocktake"] = [async (req, res) => {
    const productId = integerPath(req, res, "product_id");
    if (productId === undefined) return;
    const body = stocktakeSchema.parse(req.body);
    try {
      const result = await pool.query(
        `CALL public.stockwise_record_stocktake_write(
           $1, $2, $3, $4, $5, NULL
         )`,
        [
          organizationId(req),
          req.organization!.email,
          productId,
          body.counted_quantity,
          body.remarks.trim(),
        ],
      );
      res.json({ quantity: asNumber(result.rows[0]?.o_quantity) });
    } catch (error) {
      if (pgState(error) === "22P02") {
        throw new HttpError(
          409,
          "The stocktake conflicts with existing inventory data.",
        );
      }
      throw inventoryError(error, "Unable to record the stocktake.");
    }
  }];

  return handlers;

}