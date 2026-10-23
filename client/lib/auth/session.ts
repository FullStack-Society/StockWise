import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { SESSION_COOKIE } from "./constants";

export type SessionUser = { id: string; name: string; role: string };

const SHORT_SESSION = 60 * 60 * 8; // 8 hours (cookie ends when browser closes)
const LONG_SESSION = 60 * 60 * 24 * 30; // 30 days ("Remember me")

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or shorter than 32 characters (see .env.local.example)",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(user: SessionUser, remember: boolean) {
  const seconds = remember ? LONG_SESSION : SHORT_SESSION;

  const token = await new SignJWT({ ...user })
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
    ...(remember ? { maxAge: seconds } : {}), // no maxAge = session cookie
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Returns the logged-in user, or null. Verified on the server every time. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: ["HS256"],
    });
    return {
      id: String(payload.id),
      name: String(payload.name),
      role: String(payload.role),
    };
  } catch {
    return null; // expired or tampered
  }
});

/** Use in protected pages / data functions: redirects to /login if not signed in. */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
