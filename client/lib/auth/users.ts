import "server-only";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { apiRequest } from "@/lib/api/client";
import type { Role } from "./roles";

export type AuthUser = {
    id: number;
    name: string;
    email: string;
    role: Role;
};

type LoginResponse = {
  user?: AuthUser | null;
  two_factor_required?: boolean;
  challenge_token?: string | null;
};

export async function verifyCredentials(
  email: string,
  password: string,
  deviceId: string,
) {
  const response = await apiRequest<LoginResponse>(ENDPOINTS.auth.login, {
    method: "POST",
    body: { email, password, device_id: deviceId },
  });

  if (response.two_factor_required && response.challenge_token) {
    return {
      twoFactorRequired: true as const,
      challengeToken: response.challenge_token,
    };
  }
  if (!response.user) throw new Error("The authentication response was incomplete.");
  return {
    twoFactorRequired: false as const,
    user: {
      id: String(response.user.id),
      name: response.user.name,
      email: response.user.email,
      role: response.user.role,
    },
  };
}

export async function verifyTwoFactorCredential(
  challengeToken: string,
  code: string,
  deviceId: string,
) {
  const response = await apiRequest<LoginResponse>(ENDPOINTS.auth.verifyTwoFactor, {
    method: "POST",
    body: { challenge_token: challengeToken, code, device_id: deviceId },
  });
  if (!response.user) throw new Error("The verification response was incomplete.");
  return {
    id: String(response.user.id),
    name: response.user.name,
    email: response.user.email,
    role: response.user.role,
  };
}

export async function registerAccount(
  name: string,
  email: string,
  password: string,
) {
  const response = await apiRequest<LoginResponse>(ENDPOINTS.auth.register, {
    method: "POST",
    body: { name, email, password },
  });
  if (!response.user) throw new Error("The registration response was incomplete.");
  return {
    id: String(response.user.id),
    name: response.user.name,
    email: response.user.email,
    role: response.user.role,
  };
}
