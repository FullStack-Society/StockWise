import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(1).max(160),
  timezone: z.enum([
    "Asia/Manila",
    "Asia/Singapore",
    "America/Los_Angeles",
    "America/Chicago",
    "America/New_York",
    "Europe/London",
    "Europe/Berlin",
    "UTC",
  ]),
});

export const preferencesSchema = z.object({
  invitation_notifications: z.boolean(),
  theme: z.enum(["dark", "light", "system"]),
  date_format: z.enum(["mdy", "dmy", "ymd"]),
  currency: z.enum(["USD", "PHP", "EUR"]),
  density: z.enum(["comfortable", "compact"]),
  auto_sync_reports: z.boolean(),
  prioritize_low_stock: z.boolean(),
});

export const securityPreferencesSchema = z.object({
  login_alert_emails: z.boolean(),
  auto_sign_out_idle: z.boolean(),
});

export const inventoryDefaultsSchema = z.object({
  default_reorder_point: z.number().int().min(0).max(2_147_483_647),
});

export const consentSchema = z.object({ enabled: z.boolean() });

export const passwordSchema = z.object({
  current_password: z.string().min(1).max(256),
  new_password: z.string().min(12).max(256),
});

export const codeSchema = z.object({ code: z.string().min(6).max(32) });

export const avatarSchema = z.object({
  avatar_data: z.string().max(900_000).nullable(),
});

export type ProfileInput = z.input<typeof profileSchema>;
export type Profile = z.output<typeof profileSchema>;

export type PreferencesInput = z.input<typeof preferencesSchema>;
export type Preferences = z.output<typeof preferencesSchema>;

export type SecurityPreferencesInput = z.input<typeof securityPreferencesSchema>;
export type SecurityPreferences = z.output<typeof securityPreferencesSchema>;

export type InventoryDefaultsInput = z.input<typeof inventoryDefaultsSchema>;
export type InventoryDefaults = z.output<typeof inventoryDefaultsSchema>;

export type ConsentInput = z.input<typeof consentSchema>;
export type Consent = z.output<typeof consentSchema>;

export type PasswordInput = z.input<typeof passwordSchema>;
export type Password = z.output<typeof passwordSchema>;

export type CodeInput = z.input<typeof codeSchema>;
export type Code = z.output<typeof codeSchema>;

export type AvatarInput = z.input<typeof avatarSchema>;
export type Avatar = z.output<typeof avatarSchema>;
