import assert from "node:assert/strict";
import express from "express";
import { after, before, test } from "node:test";
import type { Pool } from "pg";
import type { AppConfig } from "../../src/config/app-config.js";
import { errorHandler } from "../../src/middlewares/error-handler.js";
import { createInventoryRouter } from "../../src/routes/inventory.routes.js";
import { createPurchaseOrdersRouter } from "../../src/routes/purchase-orders.routes.js";

const config: AppConfig = {
  appName: "StockWise API",
  appEnv: "test",
  appPort: 0,
  clientUrl: "http://localhost:3000",
  databaseUrl: "postgresql://unused",
  internalApiKey: "a".repeat(32),
  smtpHost: "smtp.example.com",
  smtpPort: 587,
  ownerName: "Test Owner",
};

let role = "owner";
let server: ReturnType<ReturnType<typeof express>["listen"]>;
let baseUrl: string;

const pool = {
  query: async (sql: string) => {
    if (sql.includes("org_get_member_role")) {
      return { rows: [{ role }] };
    }
    if (sql.includes("organization_get_inventory($1")) {
      return {
        rows: [
          {
            product_id: 7,
            product_name: "Widget",
            sku: "W-7",
            category_id: 3,
            description: null,
            price: "12.50",
            quantity: 2,
            reorder_point: 5,
            created_at: new Date("2026-01-01T00:00:00.000Z"),
            updated_at: new Date("2026-01-02T00:00:00.000Z"),
            category_name: "Parts",
            status: "Low stock",
          },
        ],
      };
    }
    if (sql.includes("stockwise_get_inventory_product_details")) {
      return {
        rows: [{ product_id: 7, variant: "Blue", upc: "012345678905" }],
      };
    }
    if (sql.includes("CALL public.stockwise_create_inventory_category")) {
      return {
        rows: [
          {
            o_category_id: 4,
            o_category_name: "Parts",
            o_description: null,
          },
        ],
      };
    }
    if (sql.includes("stockwise_get_purchase_orders")) {
      return {
        rows: [
          {
            order_id: "14",
            order_number: "2",
            notes: null,
            created_by_email: "buyer@example.com",
            created_at: new Date("2026-01-03T00:00:00.000Z"),
            status: "Partially received",
            item_id: "21",
            product_id: 7,
            product_name: "Widget",
            sku: "W-7",
            quantity_ordered: 4,
            unit_price: "3.50",
            quantity_received: 1,
          },
        ],
      };
    }
    throw new Error(`Unexpected query: ${sql}`);
  },
} as unknown as Pool;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/inventory", createInventoryRouter(pool, config));
  app.use("/api/orders", createPurchaseOrdersRouter(pool, config));
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

function headers() {
  return {
    "content-type": "application/json",
    "x-internal-api-key": config.internalApiKey,
    "x-organization-id": "12",
    "x-user-email": "buyer@example.com",
  };
}

test("inventory list preserves fields and enriches variants and UPC", async () => {
  const response = await fetch(
    `${baseUrl}/api/inventory/?search=widget&category_id=3`,
    { headers: headers() },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [
    {
      product_id: 7,
      product_name: "Widget",
      sku: "W-7",
      category_id: 3,
      description: null,
      price: 12.5,
      quantity: 2,
      reorder_point: 5,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
      category_name: "Parts",
      status: "Low stock",
      variant: "Blue",
      upc: "012345678905",
    },
  ]);
});

test("purchase order list groups the SQL rows into response items", async () => {
  const response = await fetch(`${baseUrl}/api/orders/`, {
    headers: headers(),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [
    {
      order_id: 14,
      order_number: 2,
      notes: null,
      created_by_email: "buyer@example.com",
      created_at: "2026-01-03T00:00:00.000Z",
      status: "Partially received",
      items: [
        {
          item_id: 21,
          product_id: 7,
          product_name: "Widget",
          sku: "W-7",
          quantity_ordered: 4,
          unit_price: 3.5,
          quantity_received: 1,
          quantity_remaining: 3,
        },
      ],
    },
  ]);
});

test("category management is restricted to owners and managers", async () => {
  role = "staff";
  const response = await fetch(`${baseUrl}/api/inventory/categories/`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ category_name: "Parts" }),
  });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    detail: "Only owners and managers can manage inventory categories.",
  });
  role = "owner";
});

test("category creation uses the database procedure and preserves its response", async () => {
  const response = await fetch(`${baseUrl}/api/inventory/categories/`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ category_name: "Parts" }),
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    category_id: 4,
    category_name: "Parts",
    description: null,
  });
});

test("purchase order query validation reports the query location", async () => {
  const response = await fetch(`${baseUrl}/api/orders/?limit=0`, {
    headers: headers(),
  });
  assert.equal(response.status, 422);
  const body = (await response.json()) as {
    detail: Array<{ loc: string[] }>;
  };
  assert.deepEqual(body.detail[0]?.loc, ["query", "limit"]);
});
