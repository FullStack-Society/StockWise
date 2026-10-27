import "server-only";
import { apiRequest } from "./client";

export type AccountSettings = {
  email: string;
  name: string;
  position: string;
  timezone: string;
  invitation_notifications: boolean;
};

const ROOT = "/api/settings";

export function getAccountSettings(email: string) {
  return apiRequest<AccountSettings>(ROOT, { query: { email } });
}

export function updateAccountProfile(
  email: string,
  input: { timezone: string },
) {
  return apiRequest<AccountSettings>(`${ROOT}/profile`, {
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
  return apiRequest<AccountSettings>(`${ROOT}/preferences`, {
    method: "PUT",
    query: { email },
    body: input,
  });
}

export function softDeleteCurrentAccount() {
  return apiRequest<void>(`${ROOT}/account`, {
    method: "DELETE",
    signActor: true,
  });
}
