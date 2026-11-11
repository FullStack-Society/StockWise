import {
  createHash,
  createHmac,
  createDecipheriv,
  pbkdf2,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const HASH_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const HASH_PREFIX = `pbkdf2_sha256$${HASH_ITERATIONS}$`;

function pbkdf2Async(
  password: string,
  salt: Buffer,
  iterations: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    pbkdf2(password, salt, iterations, 32, "sha256", (error, digest) => {
      if (error) reject(error);
      else resolve(digest);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const digest = await pbkdf2Async(password, salt, HASH_ITERATIONS);
  return `${HASH_PREFIX}${salt.toString("hex")}$${digest.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  encoded: unknown,
): Promise<boolean> {
  if (typeof encoded !== "string") return false;
  const match = /^pbkdf2_sha256\$(\d+)\$([0-9a-f]{32})\$([0-9a-f]{64})$/.exec(
    encoded,
  );
  if (!match || Number(match[1]) !== HASH_ITERATIONS) return false;

  const salt = Buffer.from(match[2]!, "hex");
  const expected = Buffer.from(match[3]!, "hex");
  const actual = await pbkdf2Async(password, salt, HASH_ITERATIONS);
  return timingSafeEqual(actual, expected);
}

function fernetKeys(internalApiKey: string): Buffer[] {
  const keys: Buffer[] = [];
  const configured = process.env.TOTP_ENCRYPTION_KEYS;
  if (configured) {
    for (const rawKey of configured.split(",")) {
      const key = rawKey.trim();
      if (key) keys.push(Buffer.from(key, "base64url"));
    }
  }
  if (internalApiKey.length >= 32) {
    const legacy = createHash("sha256")
      .update(`${internalApiKey}|stockwise-totp-secret-v1`, "utf8")
      .digest();
    const legacyKey = Buffer.from(legacy.toString("base64url"), "base64url");
    if (!keys.some((key) => key.equals(legacyKey))) keys.push(legacyKey);
  }
  if (keys.length === 0 || keys.some((key) => key.length !== 32)) {
    throw new Error(
      "Two-factor authentication requires valid TOTP_ENCRYPTION_KEYS or a configured internal API key.",
    );
  }
  return keys;
}

export function decryptTotpSecret(
  ciphertext: string | null | undefined,
  internalApiKey: string,
): string {
  if (!ciphertext) throw new Error("Missing authenticator secret.");
  let token: Buffer;
  try {
    token = Buffer.from(ciphertext, "base64url");
  } catch {
    throw new Error("Invalid authenticator secret.");
  }
  if (token.length < 1 + 8 + 16 + 16 + 32 || token[0] !== 0x80) {
    throw new Error("Invalid authenticator secret.");
  }

  const body = token.subarray(0, -32);
  const suppliedMac = token.subarray(-32);
  for (const key of fernetKeys(internalApiKey)) {
    const expectedMac = createHmac("sha256", key.subarray(0, 16))
      .update(body)
      .digest();
    if (!timingSafeEqual(expectedMac, suppliedMac)) continue;
    try {
      const iv = body.subarray(9, 25);
      const encrypted = body.subarray(25);
      const decipher = createDecipheriv(
        "aes-128-cbc",
        key.subarray(16),
        iv,
      );
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
        "ascii",
      );
    } catch {
      throw new Error("Invalid authenticator secret.");
    }
  }
  throw new Error(
    "The authenticator secret cannot be decrypted. Check the internal API key.",
  );
}

function decodeBase32(value: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = value.replace(/=+$/, "").toUpperCase();
  let buffer = 0;
  let bits = 0;
  const output: number[] = [];
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Invalid TOTP secret.");
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 0xff);
    }
  }
  return Buffer.from(output);
}

export function totpAtStep(secret: string, step: number): string {
  const key = decodeBase32(secret);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac("sha1", key).update(counter).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(binary).padStart(6, "0");
}

export function matchingTotpStep(secret: string, code: string): number | null {
  const normalized = code.replace(/\D/g, "");
  if (!/^\d{6}$/.test(normalized)) return null;
  const currentStep = Math.floor(Date.now() / 30_000);
  for (const step of [currentStep - 1, currentStep, currentStep + 1]) {
    const expected = Buffer.from(totpAtStep(secret, step));
    const supplied = Buffer.from(normalized);
    if (timingSafeEqual(expected, supplied)) return step;
  }
  return null;
}

export function hashRecoveryCode(code: string): string {
  const normalized = code.replace(/-/g, "").trim().toUpperCase();
  if (/[^\x00-\x7f]/.test(normalized)) {
    throw new Error("Recovery codes must contain ASCII characters.");
  }
  return createHash("sha256").update(normalized, "ascii").digest("hex");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function registrationCodeHash(
  internalApiKey: string,
  email: string,
  code: string,
): string {
  if (internalApiKey.length < 32) {
    throw new Error(
      "Email verification requires a configured internal API key.",
    );
  }
  return createHmac("sha256", internalApiKey)
    .update(`stockwise-registration:${email.trim().toLowerCase()}:${code}`)
    .digest("hex");
}
