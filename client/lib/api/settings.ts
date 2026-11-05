import "server-only";
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
};

export function getAccountSettings() {
  return apiRequest<AccountSettings>(ENDPOINTS.settings.root, {
    signActor: true,
  });
}

export function updateAccountProfile(
  input: { name: string; timezone: string },
) {
  return apiRequest<AccountSettings>(ENDPOINTS.settings.profile, {
    method: "PUT",
    body: input,
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
