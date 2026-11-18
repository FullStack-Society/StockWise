import assert from "node:assert/strict";
import { pbkdf2Sync } from "node:crypto";
import { test } from "node:test";
import {
  hashPassword,
  hashRecoveryCode,
  totpAtStep,
  verifyPassword,
} from "../../src/services/auth-crypto.js";

test("password hashes retain the Python PBKDF2 encoding", async () => {
  const password = "StockWise-Strong-Password1";
  const encoded = await hashPassword(password);
  const match =
    /^pbkdf2_sha256\$600000\$([0-9a-f]{32})\$([0-9a-f]{64})$/.exec(encoded);
  assert.ok(match);
  assert.equal(
    pbkdf2Sync(password, Buffer.from(match[1]!, "hex"), 600_000, 32, "sha256")
      .toString("hex"),
    match[2],
  );
  assert.equal(await verifyPassword(password, encoded), true);
  assert.equal(await verifyPassword("incorrect", encoded), false);
});

test("TOTP calculation matches the SHA-1 six-digit standard vector", () => {
  assert.equal(totpAtStep("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 1), "287082");
});

test("recovery hashes normalize formatted codes", () => {
  assert.equal(
    hashRecoveryCode(" abcd-1234 "),
    hashRecoveryCode("ABCD1234"),
  );
});
