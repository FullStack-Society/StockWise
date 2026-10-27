import "server-only";
import { apiRequest } from "./client";
import { ENDPOINTS } from "./endpoints";

export type AccountSettings = {
  email: string;
  name: string;
  position: string;
  timezone: string;
  invitation_notifications: boolean;
};

export function getAccountSettings(email: string) {
  return apiRequest<AccountSettings>(ENDPOINTS.settings.root, {
    query: { email },
  });
}

export function updateAccountProfile(
  email: string,
  input: { timezone: string },
) {
  return apiRequest<AccountSettings>(ENDPOINTS.settings.profile, {
    method: "PUT",
    query: { email },
    body: input,
  });
}

export function updateAccountPreferences(
  email: string,
  input: {
    invitation_notifications: boolean;
  },
) {
  return apiRequest<AccountSettings>(ENDPOINTS.settings.preferences, {
    method: "PUT",
    query: { email },
    body: input,
  });
}

export function softDeleteCurrentAccount() {
  return apiRequest<void>(ENDPOINTS.settings.account, {
    method: "DELETE",
    signActor: true,
  });
}
