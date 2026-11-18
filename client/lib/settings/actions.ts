"use server";

import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  deleteSession,
  requireOrganizationSession,
  requireSession,
  updateProfileSession,
} from "@/lib/auth/session";
import {
  updateAccountPassword,
  softDeleteCurrentAccount,
  updateAccountPreferences,
  updateAccountProfile,
  updateAccountAvatar,
  getTwoFactorStatus as loadTwoFactorStatus,
  beginTwoFactorEnrollment as beginTwoFactorEnrollmentRequest,
  confirmTwoFactorEnrollment as confirmTwoFactorEnrollmentRequest,
  disableTwoFactor as disableTwoFactorRequest,
  getUsageAnalyticsConsent as loadUsageAnalyticsConsent,
  updateUsageAnalyticsConsent,
  getAccountSecurityStatus as loadAccountSecurityStatus,
  updateInventoryDefaults as updateInventoryDefaultsRequest,
  getSecurityPrivacyPreferences as loadSecurityPrivacyPreferences,
  updateSecurityPrivacyPreferences as updateSecurityPrivacyPreferencesRequest,
  type SecurityPrivacyPreferences,
} from "@/lib/api/settings";
import { recordUsagePageView as recordUsagePageViewRequest } from "@/lib/api/reports";
import type { UsageAnalyticsPage } from "@/lib/api/reports";

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

export async function getTwoFactorStatus() {
  await requireSession();
  return loadTwoFactorStatus();
}

export async function beginTwoFactorEnrollment() {
  await requireSession();
  return beginTwoFactorEnrollmentRequest();
}

export async function confirmTwoFactorEnrollment(code: string) {
  await requireSession();
  return confirmTwoFactorEnrollmentRequest(code);
}

export async function disableTwoFactor(code: string) {
  await requireSession();
  return disableTwoFactorRequest(code);
}

export async function getUsageAnalyticsConsent() {
  await requireSession();
  return loadUsageAnalyticsConsent();
}

export async function setUsageAnalyticsConsent(enabled: boolean) {
  await requireSession();
  return updateUsageAnalyticsConsent(enabled);
}

export async function getAccountSecurityStatus() {
  await requireSession();
  return loadAccountSecurityStatus();
}

export async function getSecurityPrivacyPreferences() {
  await requireSession();
  return loadSecurityPrivacyPreferences();
}

export async function saveSecurityPrivacyPreferences(
  preferences: SecurityPrivacyPreferences,
) {
  await requireSession();
  if (
    typeof preferences?.login_alert_emails !== "boolean" ||
    typeof preferences?.auto_sign_out_idle !== "boolean"
  ) {
    return { ok: false as const, error: "The privacy preference values are invalid." };
  }
  try {
    const saved = await updateSecurityPrivacyPreferencesRequest(preferences);
    return { ok: true as const, preferences: saved };
  } catch (error) {
    console.error("[StockWise] Unable to save security privacy preferences:", error);
    return {
      ok: false as const,
      error: error instanceof ApiError ? error.message : "Could not save this privacy setting. Try again.",
    };
  }
}

export async function saveInventoryDefaults(defaultReorderPoint: number) {
  await requireSession();
  if (
    !Number.isInteger(defaultReorderPoint) ||
    defaultReorderPoint < 0 ||
    defaultReorderPoint > 2_147_483_647
  ) {
    return { ok: false as const, error: "Enter a valid non-negative whole number." };
  }
  try {
    await updateInventoryDefaultsRequest(defaultReorderPoint);
    return { ok: true as const };
  } catch (error) {
    console.error("[StockWise] Unable to save inventory defaults:", error);
    return {
      ok: false as const,
      error: error instanceof ApiError ? error.message : "Could not save inventory defaults. Try again.",
    };
  }
}

export async function recordUsageAnalyticsPageView(page: UsageAnalyticsPage) {
  await requireOrganizationSession();
  await recordUsagePageViewRequest(page);
}

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

export async function saveProfileAvatar(
  avatarData: string,
): Promise<SettingsActionResult> {
  await requireSession();
  if (
    typeof avatarData !== "string" ||
    avatarData.length > 900_000 ||
    !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
      avatarData,
    )
  ) {
    return { ok: false, error: "Choose a valid JPEG, PNG, or WebP image." };
  }
  try {
    await updateAccountAvatar(avatarData);
    return { ok: true };
  } catch (error) {
    console.error("[StockWise] Unable to save profile image:", error);
    return {
      ok: false,
      error:
        error instanceof ApiError
          ? error.message
          : "Could not save your profile image. Try again.",
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
