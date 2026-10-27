import "server-only";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { apiRequest } from "@/lib/api/client";
import type { Role } from "./roles";

type LoginResponse = {
  user: {
    id: number;
    name: string;
    email: string;
    role: Role;
  };
};

export async function verifyCredentials(email: string, password: string) {
  const response = await apiRequest<LoginResponse>(ENDPOINTS.login, {
    method: "POST",
    body: { email, password },
  });

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
  const response = await apiRequest<LoginResponse>(ENDPOINTS.register, {
    method: "POST",
    body: { name, email, password },
  });

  return {
    id: String(response.user.id),
    name: response.user.name,
    email: response.user.email,
    role: response.user.role,
  };
}
