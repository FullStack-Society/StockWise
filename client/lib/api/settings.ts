import "server-only";
import { cache } from "react";
import { apiRequest } from "./client";
import { ENDPOINTS } from "./endpoints";

export type AccountSettings = {
  email: string;
  name: string;
  position: string;
  timezone: string;
  invitation_notifications: boolean;
  theme: "dark" | "light" | "system";
  date_format: "mdy" | "dmy" | "ymd";
  currency: "USD" | "PHP" | "EUR";
  density: "comfortable" | "compact";
  auto_sync_reports: boolean;
  prioritize_low_stock: boolean;
  avatar_data: string | null;
};

export type AccountAvatar = { avatar_data: string | null };

export type TwoFactorStatus = { enabled: boolean };
export type InventoryDefaults = { default_reorder_point: number };
export type AccountSecurityStatus = {
  two_factor_enabled: boolean;
  google_account_connected: boolean;
};
export type SecurityPrivacyPreferences = {
  login_alert_emails: boolean;
  auto_sign_out_idle: boolean;
};

export function getAccountSecurityStatus() {
  return apiRequest<AccountSecurityStatus>(ENDPOINTS.settings.securityStatus, {
    signActor: true,
  });
}

export function getInventoryDefaults() {
  return apiRequest<InventoryDefaults>(ENDPOINTS.settings.inventoryDefaults, {
    signActor: true,
  });
}

export function updateInventoryDefaults(defaultReorderPoint: number) {
  return apiRequest<InventoryDefaults>(ENDPOINTS.settings.inventoryDefaults, {
    method: "PUT",
    body: { default_reorder_point: defaultReorderPoint },
    signActor: true,
  });
}

export function getSecurityPrivacyPreferences() {
  return apiRequest<SecurityPrivacyPreferences>(
    ENDPOINTS.settings.securityPrivacyPreferences,
    { signActor: true },
  );
}

export function updateSecurityPrivacyPreferences(
  preferences: SecurityPrivacyPreferences,
) {
  return apiRequest<SecurityPrivacyPreferences>(
    ENDPOINTS.settings.securityPrivacyPreferences,
    { method: "PUT", body: preferences, signActor: true },
  );
}
export type TwoFactorEnrollment = { secret: string; otpauth_uri: string };
export type TwoFactorRecoveryCodes = { recovery_codes: string[] };
export type UsageAnalyticsConsent = { enabled: boolean };

export function getUsageAnalyticsConsent() {
  return apiRequest<UsageAnalyticsConsent>(
    ENDPOINTS.settings.usageAnalyticsConsent,
    { signActor: true },
  );
}

export function updateUsageAnalyticsConsent(enabled: boolean) {
  return apiRequest<UsageAnalyticsConsent>(
    ENDPOINTS.settings.usageAnalyticsConsent,
    { method: "PUT", body: { enabled }, signActor: true },
  );
}
export const getAccountSettings = cache(() =>
  apiRequest<AccountSettings>(ENDPOINTS.settings.root, {
    signActor: true,
  }),
);

export function updateAccountProfile(
  input: { name: string; timezone: string },
) {
  return apiRequest<AccountSettings>(ENDPOINTS.settings.profile, {
    method: "PUT",
    body: input,
    signActor: true,
  });
}

export function updateAccountAvatar(avatarData: string) {
  return apiRequest<AccountAvatar>(ENDPOINTS.settings.avatar, {
    method: "PUT",
    body: { avatar_data: avatarData },
    signActor: true,
  });
}

export function updateAccountPreferences(
  input: {
    invitation_notifications: boolean;
    theme: "dark" | "light" | "system";
    date_format: "mdy" | "dmy" | "ymd";
    currency: "USD" | "PHP" | "EUR";
    density: "comfortable" | "compact";
    auto_sync_reports: boolean;
    prioritize_low_stock: boolean;
  },
) {
  return apiRequest<AccountSettings>(ENDPOINTS.settings.preferences, {
    method: "PUT",
    body: input,
    signActor: true,
  });
}

export function updateAccountPassword(input: {
  current_password: string;
  new_password: string;
}) {
  return apiRequest<void>(ENDPOINTS.settings.password, {
    method: "PUT",
    body: input,
    signActor: true,
  });
}

export function softDeleteCurrentAccount() {
  return apiRequest<void>(ENDPOINTS.settings.account, {
    method: "DELETE",
    signActor: true,
  });
}

export function getTwoFactorStatus() {
  return apiRequest<TwoFactorStatus>(ENDPOINTS.settings.mfa, { signActor: true });
}

export function beginTwoFactorEnrollment() {
  return apiRequest<TwoFactorEnrollment>(ENDPOINTS.settings.mfaEnroll, {
    method: "POST",
    signActor: true,
  });
}

export function confirmTwoFactorEnrollment(code: string) {
  return apiRequest<TwoFactorRecoveryCodes>(ENDPOINTS.settings.mfaConfirm, {
    method: "POST",
    body: { code },
    signActor: true,
  });
}

export function disableTwoFactor(code: string) {
  return apiRequest<void>(ENDPOINTS.settings.mfaDisable, {
    method: "POST",
    body: { code },
    signActor: true,
  });
}
