"use server";

import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  deleteSession,
  requireSession,
  updateProfileSession,
} from "@/lib/auth/session";
import {
  updateAccountPassword,
  softDeleteCurrentAccount,
  updateAccountPreferences,
  updateAccountProfile,
} from "@/lib/api/settings";

const TIMEZONES = new Set([
  "Asia/Manila",
  "Asia/Singapore",
  "America/Los_Angeles",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "UTC",
]);

export type SettingsActionResult = { ok: true } | { ok: false; error: string };

export async function saveProfileSettings(input: {
  name: string;
  timezone: string;
}): Promise<SettingsActionResult> {
  const session = await requireSession();
  const name = String(input?.name ?? "").trim();
  const timezone = String(input?.timezone ?? "");
  if (!name || name.length > 160) {
    return { ok: false, error: "Enter your name (up to 160 characters)." };
  }
  if (!TIMEZONES.has(timezone)) {
    return { ok: false, error: "Choose a valid timezone." };
  }
  try {
    await updateAccountProfile({ name, timezone });
    await updateProfileSession(name);
    return { ok: true };
  } catch (error) {
    console.error("[StockWise] Unable to save profile settings:", error);
    return {
      ok: false,
      error:
        error instanceof ApiError
          ? error.message
          : "Could not save your profile settings. Try again.",
    };
  }
}

export async function savePreferences(input: {
  invitation_notifications: boolean;
  theme: "dark" | "light" | "system";
  date_format: "mdy" | "dmy" | "ymd";
  currency: "USD" | "PHP" | "EUR";
  density: "comfortable" | "compact";
  auto_sync_reports: boolean;
  prioritize_low_stock: boolean;
}): Promise<SettingsActionResult> {
  await requireSession();
  if (
    typeof input?.invitation_notifications !== "boolean" ||
    !["dark", "light", "system"].includes(input.theme) ||
    !["mdy", "dmy", "ymd"].includes(input.date_format) ||
    !["USD", "PHP", "EUR"].includes(input.currency) ||
    !["comfortable", "compact"].includes(input.density) ||
    typeof input.auto_sync_reports !== "boolean" ||
    typeof input.prioritize_low_stock !== "boolean"
  ) {
    return { ok: false, error: "The preference values are invalid." };
  }
  try {
    await updateAccountPreferences(input);
    return { ok: true };
  } catch (error) {
    console.error("[StockWise] Unable to save preferences:", error);
    return {
      ok: false,
      error:
        error instanceof ApiError
          ? error.message
          : "Could not save your preferences. Try again.",
    };
  }
}

export async function changeAccountPassword(input: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}): Promise<SettingsActionResult> {
  await requireSession();
  const currentPassword = String(input?.current_password ?? "");
  const newPassword = String(input?.new_password ?? "");
  const confirmPassword = String(input?.confirm_password ?? "");
  if (newPassword.length < 12 || newPassword.length > 256) {
    return {
      ok: false,
      error: "Your new password must be between 12 and 256 characters.",
    };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, error: "The new passwords do not match." };
  }
  try {
    await updateAccountPassword({
      current_password: currentPassword,
      new_password: newPassword,
    });
    return { ok: true };
  } catch (error) {
    console.error("[StockWise] Unable to change account password:", error);
    return {
      ok: false,
      error:
        error instanceof ApiError
          ? error.message
          : "Could not update your password. Try again.",
    };
  }
}

export async function deleteMyAccount(): Promise<SettingsActionResult> {
  await requireSession();
  try {
    await softDeleteCurrentAccount();
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof ApiError
          ? error.message
          : "Could not delete your account. Try again.",
    };
  }
  await deleteSession();
  redirect("/login?accountDeleted=1");
}
