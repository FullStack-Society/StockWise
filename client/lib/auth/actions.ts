"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { ROUTES } from "@/lib/routes";
import { createSession, deleteSession } from "./session";
import { registerAccount, verifyCredentials } from "./users";
import { listOrganizations } from "@/lib/api/organizations";

export type LoginState = { error?: string; email?: string };
export type RegisterState = { error?: string; name?: string; email?: string };

export async function register(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");

  if (!name || name.length > 160) {
    return { error: "Enter your name (up to 160 characters).", name, email };
  }
  if (!email || !password) {
    return { error: "Enter your email and password.", name, email };
  }
  if (password.length < 12 || password.length > 128) {
    return {
      error: "Use a password between 12 and 128 characters.",
      name,
      email,
    };
  }
  if (password !== confirmation) {
    return { error: "The passwords do not match.", name, email };
  }
  try {
    const user = await registerAccount(name, email, password);
    await createSession({ ...user, organizationId: null }, false);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ApiError && error.status === 409) {
      return {
        error: "An account with this email already exists. Sign in instead.",
        name,
        email,
      };
    }
    console.error("[StockWise] Registration failed:", error);
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Unable to create your account right now.",
      name,
      email,
    };
  }

  redirect(ROUTES.users);
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";

  if (!email || !password) {
    return { error: "Enter your email and password.", email };
  }

  let user: Awaited<ReturnType<typeof verifyCredentials>>;
  try {
    user = await verifyCredentials(email, password);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ApiError && error.status === 401) {
      return { error: "Invalid email or password.", email };
    }
    console.error("[StockWise] Login failed:", error);
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Unable to sign in right now. Please try again.",
      email,
    };
  }

  let organizations: Awaited<ReturnType<typeof listOrganizations>>;
  try {
    organizations = await listOrganizations(user.email);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[StockWise] Organization lookup after login failed:", error);
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Unable to load your organizations. Please try again.",
      email,
    };
  }

  const activeOrganization = organizations[0] ?? null;
  await createSession(
    {
      ...user,
      organizationId: activeOrganization?.organization_id ?? null,
      role: activeOrganization?.role ?? user.role,
    },
    remember,
  );
  redirect(activeOrganization ? ROUTES.dashboard : ROUTES.users);
}

export async function logout() {
  await deleteSession();
  redirect(ROUTES.login);
}
