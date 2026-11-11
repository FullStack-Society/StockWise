import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  APP_NAME: z.string().default("StockWise API"),
  APP_ENV: z.string().default("development"),
  APP_PORT: z.coerce.number().int().min(1).max(65535).default(8001),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  INTERNAL_API_KEY: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().optional(),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USERNAME: z.string().optional(),
  SMTP_APP_PASSWORD: z.string().optional(),
  TOTP_ENCRYPTION_KEYS: z.string().optional(),
  OWNER_NAME: z.string().default("StockWise Owner"),
  OWNER_EMAIL: z.string().email().optional(),
  OWNER_PASSWORD: z.string().optional(),
});

export type AppConfig = {
  appName: string;
  appEnv: string;
  appPort: number;
  clientUrl: string;
  databaseUrl: string;
  internalApiKey: string;
  googleClientId?: string;
  smtpHost: string;
  smtpPort: number;
  smtpUsername?: string;
  smtpAppPassword?: string;
  totpEncryptionKeys?: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPassword?: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid backend configuration: ${details}`);
  }

  return {
    appName: parsed.data.APP_NAME,
    appEnv: parsed.data.APP_ENV,
    appPort: parsed.data.APP_PORT,
    clientUrl: parsed.data.CLIENT_URL.replace(/\/+$/, ""),
    databaseUrl: parsed.data.DATABASE_URL,
    internalApiKey: parsed.data.INTERNAL_API_KEY,
    googleClientId: parsed.data.GOOGLE_CLIENT_ID,
    smtpHost: parsed.data.SMTP_HOST,
    smtpPort: parsed.data.SMTP_PORT,
    smtpUsername: parsed.data.SMTP_USERNAME,
    smtpAppPassword: parsed.data.SMTP_APP_PASSWORD,
    totpEncryptionKeys: parsed.data.TOTP_ENCRYPTION_KEYS,
    ownerName: parsed.data.OWNER_NAME,
    ownerEmail: parsed.data.OWNER_EMAIL,
    ownerPassword: parsed.data.OWNER_PASSWORD,
  };
}
