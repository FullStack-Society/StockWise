import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Pool } from "pg";
import type { AppConfig } from "../src/config/app-config.js";
import { createApp } from "../src/app.js";

const config: AppConfig = {
  appName: "StockWise API",
  appEnv: "test",
  appPort: 0,
  clientUrl: "http://localhost:3000",
  databaseUrl: "postgresql://unused",
  internalApiKey: "a".repeat(32),
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  ownerName: "StockWise Owner",
};

let server: ReturnType<ReturnType<typeof createApp>["listen"]>;
let baseUrl: string;
let healthQueryCount = 0;
const databaseQueries: string[] = [];

before(async () => {
  const pool = {
    query: async (queryText: string) => {
      databaseQueries.push(queryText);
      healthQueryCount += 1;
      return {
        rows: queryText.includes("org_get_member_role")
          ? [{ role: "owner" }]
          : [{ "?column?": 1 }],
      };
    },
    connect: async () => ({
      query: async (queryText: string) => {
        databaseQueries.push(queryText);
        if (queryText.includes("CALL public.stockwise_record_sale")) {
          return { rowCount: 1, rows: [{ p_items_sold: 1 }] };
        }
        if (queryText.includes("COUNT(item.product_id)")) {
          return { rowCount: 0, rows: [] };
        }
        if (queryText.includes("FROM public.products")) {
          return { rowCount: 1, rows: [{ product_id: 7, price: "2.50" }] };
        }
        return { rowCount: 1, rows: [] };
      },
      release: () => undefined,
    }),
  };
  const app = createApp(config, pool as unknown as Pool);
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

test("root route identifies the API", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    name: "StockWise API",
    message: "Welcome to StockWise.",
    health: "/api/health/",
  });
});

test("health route verifies PostgreSQL connectivity", async () => {
  const response = await fetch(`${baseUrl}/api/health/`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
  assert.equal(healthQueryCount, 1);
});

test("health route supports the existing client path without trailing slash", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
  assert.equal(healthQueryCount, 2);
});

test("unknown API routes return a JSON not-found response", async () => {
  const response = await fetch(`${baseUrl}/api/missing`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { detail: "Not found." });
});

test("sales route requires the internal API key", async () => {
  const response = await fetch(`${baseUrl}/api/sales/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Organization-ID": "4",
      "X-User-Email": "owner@gmail.com",
    },
    body: JSON.stringify({
      sale_id: "8a5da756-2e10-4a43-92a1-52b5ec7d265a",
      payment_method: "cash",
      items: [{ product_id: 7, quantity: 1 }],
    }),
  });
  assert.equal(response.status, 401);
});

test("sales route performs checkout in a transaction", async () => {
  const response = await fetch(`${baseUrl}/api/sales/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-API-Key": config.internalApiKey,
      "X-Organization-ID": "4",
      "X-User-Email": "owner@gmail.com",
    },
    body: JSON.stringify({
      sale_id: "8a5da756-2e10-4a43-92a1-52b5ec7d265a",
      payment_method: "cash",
      items: [{ product_id: 7, quantity: 1 }],
    }),
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    sale_id: "8a5da756-2e10-4a43-92a1-52b5ec7d265a",
    items_sold: 1,
  });
  assert.ok(databaseQueries.includes("BEGIN"));
  assert.ok(databaseQueries.includes("COMMIT"));
  assert.ok(
    databaseQueries.some((query) =>
      query.includes("CALL public.stockwise_record_sale"),
    ),
  );
});
