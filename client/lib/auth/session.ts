import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: number | null;
};
type StoredSessionUser = SessionUser & { remember: boolean };

const SESSION_COOKIE = "stockwise_session";
const LAST_ORGANIZATION_COOKIE = "stockwise_last_organization";
const LOGIN_DEVICE_COOKIE = "stockwise_login_device";
const SHORT_SESSION = 60 * 60 * 8;
const LONG_SESSION = 60 * 60 * 24 * 30;

export async function getOrCreateLoginDeviceId() {
  const jar = await cookies();
  const current = jar.get(LOGIN_DEVICE_COOKIE)?.value;
  if (current && /^[0-9a-f-]{36}$/i.test(current)) return current;

  const deviceId = randomUUID();
  jar.set(LOGIN_DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return deviceId;
}

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("your_generated_secret_here (see .env.local.example)");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(user: SessionUser, remember: boolean) {
  const seconds = remember ? LONG_SESSION : SHORT_SESSION;

  const token = await new SignJWT({ ...user, remember })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${seconds}s`)
    .sign(getKey());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true, // JS in the browser can't read it
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: seconds } : {}),
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getLastOrganizationId(email: string) {
  const value = (await cookies()).get(LAST_ORGANIZATION_COOKIE)?.value;
  const [storedEmail, storedId] = value?.split("|") ?? [];
  if (storedEmail !== email.trim().toLowerCase()) return null;
  const organizationId = Number(storedId);
  return Number.isSafeInteger(organizationId) && organizationId > 0
    ? organizationId
    : null;
}

export async function rememberLastOrganization(
  email: string,
  organizationId: number | null,
) {
  const jar = await cookies();
  if (!organizationId || !Number.isSafeInteger(organizationId) || organizationId <= 0) {
    jar.delete(LAST_ORGANIZATION_COOKIE);
    return;
  }
  jar.set(LAST_ORGANIZATION_COOKIE, `${email.trim().toLowerCase()}|${organizationId}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LONG_SESSION,
  });
}

/** Returns the logged-in user, or null. Verified on the server every time. */
export const getSession = cache(async (): Promise<StoredSessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.email !== "string" || !payload.email) return null;
    return {
      id: String(payload.id),
      name: String(payload.name),
      email: payload.email.toLowerCase(),
      role: String(payload.role),
      organizationId:
        typeof payload.organizationId === "number"
          ? payload.organizationId
          : null,
      remember: payload.remember === true,
    };
  } catch {
    return null; // expired or tampered
  }
});

export async function updateOrganizationSession(
  organizationId: number | null,
  role: string,
) {
  const session = await getSession();
  if (!session) redirect("/login");
  await createSession({ ...session, organizationId, role }, session.remember);
}

export async function updateProfileSession(name: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  await createSession({ ...session, name }, session.remember);
}

/** Use in protected pages / data functions: redirects to /login if not signed in. */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireOrganizationSession() {
  const session = await requireSession();
  if (!session.organizationId) redirect("/pages/users");
  return session;
}
