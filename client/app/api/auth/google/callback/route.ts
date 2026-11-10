import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { EncryptJWT } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { apiRequest, ApiError } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import {
  createSession,
  getLastOrganizationId,
  getOrCreateLoginDeviceId,
} from "@/lib/auth/session";
import { listOrganizations, publishMemberLogin } from "@/lib/api/organizations";
import { ROUTES } from "@/lib/routes";

const STATE_COOKIE = "stockwise_google_state";
const NONCE_COOKIE = "stockwise_google_nonce";
const MODE_COOKIE = "stockwise_google_mode";
const GOOGLE_REGISTRATION_COOKIE = "stockwise_google_registration";
const CALLBACK_URI =
  process.env.GOOGLE_REDIRECT_URI ??
  "http://localhost:3000/api/auth/google/callback";

type GoogleLoginResponse = {
  user?: { id: string; name: string; email: string; role: string } | null;
  two_factor_required?: boolean;
  challenge_token?: string | null;
  registration_required?: boolean;
};

function failure(request: NextRequest, mode: string) {
  const target = mode === "register" ? "/register" : "/login";
  return NextResponse.redirect(new URL(`${target}?googleError=1`, request.url));
}

function matchesState(received: string, expected: string) {
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
}

function registrationKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("SESSION_SECRET is not configured securely.");
  return createHash("sha256").update(secret).digest();
}

export async function GET(request: NextRequest) {
  const jar = await cookies();
  const mode = jar.get(MODE_COOKIE)?.value ?? "login";
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = jar.get(STATE_COOKIE)?.value;
  const nonce = jar.get(NONCE_COOKIE)?.value;
  const code = request.nextUrl.searchParams.get("code");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  jar.delete(STATE_COOKIE);
  jar.delete(NONCE_COOKIE);
  jar.delete(MODE_COOKIE);

  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError) {
    console.warn("Google sign-in was declined or rejected by Google.", {
      error: providerError,
    });
    return failure(request, mode);
  }
  if (!state || !expectedState || !matchesState(state, expectedState)) {
    console.warn("Google sign-in callback failed state validation.");
    return failure(request, mode);
  }
  if (!nonce || !code) {
    console.warn("Google sign-in callback did not include required values.", {
      hasNonce: Boolean(nonce),
      hasCode: Boolean(code),
    });
    return failure(request, mode);
  }
  if (!clientId || !clientSecret) {
    console.error("Google sign-in is missing OAuth client configuration.", {
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
    });
    return failure(request, mode);
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: CALLBACK_URI,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.json().catch(() => ({}));
      console.error("Google authorization code exchange failed.", {
        status: tokenResponse.status,
        error:
          tokenError && typeof tokenError === "object" && "error" in tokenError
            ? tokenError.error
            : "unknown",
      });
      return failure(request, mode);
    }
    const tokens: { id_token?: string } = await tokenResponse.json();
    if (!tokens.id_token) {
      console.error("Google token response did not contain an ID token.");
      return failure(request, mode);
    }

    const result = await apiRequest<GoogleLoginResponse>(ENDPOINTS.auth.google, {
      method: "POST",
      body: {
        credential: tokens.id_token,
        nonce,
        device_id: await getOrCreateLoginDeviceId(),
        mode,
      },
    });
    if (result.registration_required) {
      const registrationToken = await new EncryptJWT({
        credential: tokens.id_token,
        nonce,
      })
        .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
        .setIssuedAt()
        .setExpirationTime("10m")
        .encrypt(registrationKey());
      const response = NextResponse.redirect(
        new URL("/register?googlePassword=1", request.url),
      );
      response.cookies.set(GOOGLE_REGISTRATION_COOKIE, registrationToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      });
      return response;
    }
    if (result.two_factor_required && result.challenge_token) {
      const response = NextResponse.redirect(
        new URL("/login?twoFactor=1", request.url),
      );
      response.cookies.set("stockwise_mfa_challenge", result.challenge_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 300,
      });
      return response;
    }
    if (!result.user) return failure(request, mode);
    const organizations = await listOrganizations(result.user.email);
    const ownedOrganization = organizations.find((org) => org.role === "owner");
    const previousId = await getLastOrganizationId(result.user.email);
    const previousOrganization = previousId
      ? organizations.find((org) => org.organization_id === previousId)
      : undefined;
    const activeOrganization =
      ownedOrganization ?? previousOrganization ?? organizations[0] ?? null;

    await createSession(
      {
        ...result.user,
        id: String(result.user.id),
        organizationId: activeOrganization?.organization_id ?? null,
        role: activeOrganization?.role ?? result.user.role,
      },
      false,
    );

    try {
      await publishMemberLogin();
    } catch (error) {
      console.error("[StockWise] Unable to create the organization login alert:", error);
    }

    return NextResponse.redirect(
      new URL(activeOrganization ? ROUTES.dashboard : ROUTES.users, request.url),
    );
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("StockWise rejected the Google sign-in request.", {
        status: error.status,
        message: error.message,
      });
    } else {
      console.error("Google sign-in callback failed.", error);
    }
    return failure(request, mode);
  }
}
