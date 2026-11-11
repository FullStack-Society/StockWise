import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import type { AppConfig } from "../config/app-config.js";
import { hashPassword } from "./auth-crypto.js";

async function inTransaction<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original transaction error.
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function seedInitialOwner(
  pool: Pool,
  config: AppConfig,
): Promise<void> {
  const ownerExists = await pool.query<{ stockwise_auth_owner_exists: boolean }>(
    "SELECT public.stockwise_auth_owner_exists()",
  );
  if (ownerExists.rows[0]?.stockwise_auth_owner_exists) return;

  const { ownerEmail, ownerPassword, ownerName } = config;
  if (!ownerEmail || !ownerPassword) {
    throw new Error(
      "Set both OWNER_EMAIL and OWNER_PASSWORD to create the initial owner.",
    );
  }
  if (ownerPassword.length < 12) {
    throw new Error("OWNER_PASSWORD must be at least 12 characters.");
  }

  const email = z.string().email().parse(ownerEmail).trim().toLowerCase();
  const account = await pool.query(
    "SELECT * FROM public.stockwise_auth_get_auth_user($1)",
    [email],
  );
  if (account.rowCount) {
    throw new Error("OWNER_EMAIL is already assigned to a non-owner account.");
  }

  const passwordHash = await hashPassword(ownerPassword);
  try {
    await inTransaction(pool, async (client) => {
      await client.query(
        "SELECT * FROM public.stockwise_auth_create_owner($1, $2, $3)",
        [ownerName.trim() || "StockWise Owner", email, passwordHash],
      );
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new Error(
        "Unable to create the initial owner because the email already exists.",
      );
    }
    throw error;
  }
}
