import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const STATE_COOKIE = "stockwise_google_state";
const NONCE_COOKIE = "stockwise_google_nonce";
const MODE_COOKIE = "stockwise_google_mode";
const CALLBACK_URI =
  process.env.GOOGLE_REDIRECT_URI ??
  "http://localhost:3000/api/auth/google/callback";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode") === "register" ? "register" : "login";
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL(`/${mode}?googleError=1`, request.url));
  }

  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: CALLBACK_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    prompt: "select_account",
  }).toString();

  const response = NextResponse.redirect(authUrl);
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  response.cookies.set(STATE_COOKIE, state, options);
  response.cookies.set(NONCE_COOKIE, nonce, options);
  response.cookies.set(MODE_COOKIE, mode, options);
  return response;
}
