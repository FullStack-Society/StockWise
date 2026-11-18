"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { jwtDecrypt } from "jose";
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
import {
  requestRegistrationCode,
  resendRegistrationCode as resendRegistrationCodeRequest,
  verifyCredentials,
  verifyRegistrationCode,
  verifyTwoFactorCredential,
} from "./users";
import { listOrganizations, publishMemberLogin } from "@/lib/api/organizations";

export type LoginState = {
  error?: string;
  email?: string;
  twoFactorRequired?: boolean;
  challengeToken?: string;
  remember?: boolean;
};
export type RegisterState = {
  error?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  verificationRequired?: boolean;
};
export type ResendRegistrationState = { error?: string; message?: string };
export type ForgotPasswordState = {
  error?: string;
  message?: string;
  email?: string;
};
export type ResetPasswordState = { error?: string; success?: boolean };
export type TwoFactorLoginState = { error?: string };

const MFA_CHALLENGE_COOKIE = "stockwise_mfa_challenge";
const GOOGLE_REGISTRATION_COOKIE = "stockwise_google_registration";

function googleRegistrationKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Google registration is not configured securely.");
  }
  return createHash("sha256").update(secret).digest();
}

type GoogleRegistrationState = { error?: string };

export async function completeGoogleRegistration(
  _previous: GoogleRegistrationState,
  formData: FormData,
): Promise<GoogleRegistrationState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");
  if (password.length < 8 || password.length > 128) {
    return { error: "Use a password between 8 and 128 characters." };
  }
  if (!/[A-Z]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return {
      error: "Your password must include a capital letter and a special character.",
    };
  }
  if (password !== confirmation) {
    return { error: "The passwords do not match." };
  }

  const jar = await cookies();
  const token = jar.get(GOOGLE_REGISTRATION_COOKIE)?.value;
  if (!token) return { error: "Google registration expired. Start again." };

  try {
    const { payload } = await jwtDecrypt(token, googleRegistrationKey(), {
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
    });
    if (
      typeof payload.credential !== "string" ||
      typeof payload.nonce !== "string"
    ) {
      return { error: "Google registration expired. Start again." };
    }

    const result = await apiRequest<{
      user?: { id: number; name: string; email: string; role: string } | null;
      two_factor_required?: boolean;
      challenge_token?: string | null;
    }>(ENDPOINTS.auth.googleRegister, {
      method: "POST",
      body: {
        credential: payload.credential,
        nonce: payload.nonce,
        password,
        device_id: await getOrCreateLoginDeviceId(),
      },
    });
    jar.delete(GOOGLE_REGISTRATION_COOKIE);

    if (result.two_factor_required && result.challenge_token) {
      jar.set(MFA_CHALLENGE_COOKIE, result.challenge_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 300,
      });
      redirect("/login?twoFactor=1");
    }
    if (!result.user) return { error: "Unable to complete Google registration." };

    const organizations = await listOrganizations(result.user.email);
    const owned = organizations.find((organization) => organization.role === "owner");
    const organization = owned ?? organizations[0] ?? null;
    await createSession(
      {
        id: String(result.user.id),
        name: result.user.name,
        email: result.user.email,
        role: organization?.role ?? result.user.role,
        organizationId: organization?.organization_id ?? null,
      },
      false,
    );
    redirect(organization ? ROUTES.dashboard : ROUTES.users);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ApiError && error.status === 401) {
      jar.delete(GOOGLE_REGISTRATION_COOKIE);
      return { error: "Google registration expired. Start again." };
    }
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Unable to save your StockWise password right now.",
    };
  }
}

async function notifyOrganizationOfLogin() {
  try {
    await publishMemberLogin();
  } catch (error) {
    console.error(
      "[StockWise] Unable to create the organization login alert:",
      error,
    );
  }
}

export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { error: "Enter your email address.", email };
  try {
    await apiRequest(ENDPOINTS.auth.forgotPassword, {
      method: "POST",
      body: { email },
    });
  } catch (error) {
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Unable to send the request right now.",
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
  if (password !== confirmation)
    return { error: "The passwords do not match." };
  try {
    await apiRequest(ENDPOINTS.auth.resetPassword, {
      method: "POST",
      body: { token, new_password: password },
    });
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Unable to reset your password right now.",
    };
  }
}

export async function register(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const name = [firstName, lastName].filter(Boolean).join(" ");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");

  if (
    !firstName ||
    !lastName ||
    firstName.length + lastName.length + 1 > 160
  ) {
    return {
      error: "Enter a first and last name (up to 160 characters total).",
      firstName,
      lastName,
      email,
    };
  }
  if (!email || !password) {
    return {
      error: "Enter your email and password.",
      firstName,
      lastName,
      email,
    };
  }
  if (!/^[^@]+@(gmail\.com|googlemail\.com)$/.test(email)) {
    return {
      error: "Use a Gmail address to register manually.",
      firstName,
      lastName,
      email,
    };
  }
  if (password.length < 8 || password.length > 128) {
    return {
      error: "Use a password between 8 and 128 characters.",
      firstName,
      lastName,
      email,
    };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      error: "Your password must include at least one capital letter.",
      firstName,
      lastName,
      email,
    };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return {
      error: "Your password must include at least one special character.",
      firstName,
      lastName,
      email,
    };
  }
  if (password !== confirmation) {
    return {
      error: "The passwords do not match.",
      firstName,
      lastName,
      email,
    };
  }
  try {
    await requestRegistrationCode(name, email, password);
    return { verificationRequired: true, firstName, lastName, email };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ApiError && error.status === 409) {
      redirect("/login?accountExists=1");
    }
    console.error("[StockWise] Registration failed:", error);
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Unable to begin registration right now.",
      firstName,
      lastName,
      email,
    };
  }
}

export async function verifyRegistration(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const code = String(formData.get("code") ?? "")
    .replace(/\D/g, "")
    .slice(0, 8);
  if (!email || !code) {
    return {
      error: "Enter the 8-digit code sent to your Gmail inbox.",
      email,
      verificationRequired: true,
    };
  }

  try {
    const user = await verifyRegistrationCode(email, code);
    await createSession({ ...user, organizationId: null }, false);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ApiError && error.status === 409) {
      return {
        error: "An account with this email already exists. Sign in instead.",
        email,
        verificationRequired: true,
      };
    }
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Unable to verify your Gmail address right now.",
      email,
      verificationRequired: true,
    };
  }

  redirect(ROUTES.users);
}

export async function resendRegistrationVerification(
  _prev: ResendRegistrationState,
  formData: FormData,
): Promise<ResendRegistrationState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { error: "Enter your Gmail address first." };
  try {
    const result = await resendRegistrationCodeRequest(email);
    return { message: result.message };
  } catch (error) {
    unstable_rethrow(error);
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Unable to resend the verification code right now.",
    };
  }
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
    return { error: "Enter your email and password.", email, remember };
  }
  if (!/^[^@]+@(gmail\.com|googlemail\.com)$/.test(email)) {
    return {
      error: "Sign in manually with your Gmail address.",
      email,
      remember,
    };
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
      return { error: "Invalid email or password.", email, remember };
    }
    console.error("[StockWise] Login failed:", error);
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Unable to sign in right now. Please try again.",
      email,
      remember,
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
      remember,
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
  if (!challengeToken || !code)
    return { error: "Enter the current authenticator code." };

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
