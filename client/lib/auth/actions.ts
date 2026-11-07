"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { cookies } from "next/headers";
import { ApiError } from "@/lib/api/client";
import { apiRequest } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { ROUTES } from "@/lib/routes";
import {
  createSession,
  deleteSession,
  getLastOrganizationId,
  getSession,
  getOrCreateLoginDeviceId,
  rememberLastOrganization,
} from "./session";
import { registerAccount, verifyCredentials, verifyTwoFactorCredential } from "./users";
import { listOrganizations, publishMemberLogin } from "@/lib/api/organizations";

export type LoginState = {
  error?: string;
  email?: string;
  twoFactorRequired?: boolean;
  challengeToken?: string;
  remember?: boolean;
};
export type RegisterState = { error?: string; name?: string; email?: string };
export type ForgotPasswordState = { error?: string; message?: string; email?: string };
export type ResetPasswordState = { error?: string; success?: boolean };
export type TwoFactorLoginState = { error?: string };

const MFA_CHALLENGE_COOKIE = "stockwise_mfa_challenge";

async function notifyOrganizationOfLogin() {
  try {
    await publishMemberLogin();
  } catch (error) {
    console.error("[StockWise] Unable to create the organization login alert:", error);
  }
}

export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter your email address.", email };
  try {
    await apiRequest(ENDPOINTS.auth.forgotPassword, {
      method: "POST",
      body: { email },
    });
  } catch (error) {
    return {
      error: error instanceof ApiError ? error.message : "Unable to send the request right now.",
      email,
    };
  }
  return {
    message: "If an account matches that email, a reset link will be sent.",
    email,
  };
}

export async function submitPasswordReset(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");
  if (password !== confirmation) return { error: "The passwords do not match." };
  try {
    await apiRequest(ENDPOINTS.auth.resetPassword, {
      method: "POST",
      body: { token, new_password: password },
    });
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof ApiError ? error.message : "Unable to reset your password right now.",
    };
  }
}

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
  if (!/[A-Z]/.test(password)) {
    return {
      error: "Your password must include at least one capital letter.",
      name,
      email,
    };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return {
      error: "Your password must include at least one special character.",
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

  let authResult: Awaited<ReturnType<typeof verifyCredentials>>;
  try {
    authResult = await verifyCredentials(
      email,
      password,
      await getOrCreateLoginDeviceId(),
    );
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

  if (authResult.twoFactorRequired) {
    return {
      email,
      twoFactorRequired: true,
      challengeToken: authResult.challengeToken,
      remember,
    };
  }
  const user = authResult.user;

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

  const ownedOrganization = organizations.find(
    (organization) => organization.role === "owner",
  );
  const lastOrganizationId = await getLastOrganizationId(user.email);
  const previousOrganization = lastOrganizationId
    ? organizations.find(
        (organization) => organization.organization_id === lastOrganizationId,
      )
    : undefined;
  const activeOrganization =
    ownedOrganization ?? previousOrganization ?? organizations[0] ?? null;
  await createSession(
    {
      ...user,
      organizationId: activeOrganization?.organization_id ?? null,
      role: activeOrganization?.role ?? user.role,
    },
    remember,
  );
  await notifyOrganizationOfLogin();
  redirect(activeOrganization ? ROUTES.dashboard : ROUTES.users);
}

export async function verifySecondFactor(
  _prev: TwoFactorLoginState,
  formData: FormData,
): Promise<TwoFactorLoginState> {
  const code = String(formData.get("code") ?? "").trim();
  const remember = formData.get("remember") === "true";
  const jar = await cookies();
  const challengeToken =
    String(formData.get("challenge_token") ?? "") ||
    jar.get(MFA_CHALLENGE_COOKIE)?.value ||
    "";
  if (!challengeToken || !code) return { error: "Enter the current authenticator code." };

  try {
    const user = await verifyTwoFactorCredential(
      challengeToken,
      code,
      await getOrCreateLoginDeviceId(),
    );
    jar.delete(MFA_CHALLENGE_COOKIE);
    const organizations = await listOrganizations(user.email);
    const ownedOrganization = organizations.find(
      (organization) => organization.role === "owner",
    );
    const lastOrganizationId = await getLastOrganizationId(user.email);
    const previousOrganization = lastOrganizationId
      ? organizations.find(
          (organization) => organization.organization_id === lastOrganizationId,
        )
      : undefined;
    const activeOrganization =
      ownedOrganization ?? previousOrganization ?? organizations[0] ?? null;
    await createSession(
      {
        ...user,
        organizationId: activeOrganization?.organization_id ?? null,
        role: activeOrganization?.role ?? user.role,
      },
      remember,
    );
    await notifyOrganizationOfLogin();
    redirect(activeOrganization ? ROUTES.dashboard : ROUTES.users);
  } catch (error) {
    unstable_rethrow(error);
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Unable to verify that code. Check it and try again.",
    };
  }
}

export async function logout() {
  const session = await getSession();
  if (session) {
    await rememberLastOrganization(session.email, session.organizationId);
  }
  await deleteSession();
  redirect(`${ROUTES.login}?loggedOut=1`);
}
