import "server-only";
import { createHmac } from "node:crypto";
import { getSession } from "@/lib/auth/session";

// Server-side only: the browser never talks to FastAPI directly (no CORS, nothing exposed).
// Keep these environment variables private; this module is server-only.
const BASE_URL = (
  process.env.API_URL ??
  process.env.BACKEND_API_URL ??
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");
const INTERNAL_API_KEY = process.env.BACKEND_API_KEY;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Options = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | null | undefined>;
  signActor?: boolean;
};

/** FastAPI errors look like {"detail": "text"} or {"detail": [{loc, msg}, ...]}. */
async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json();
    const detail = (data as { detail?: unknown } | null)?.detail;
    if (typeof detail === "string" && detail) return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((d: { loc?: unknown[]; msg?: string }) => {
          const field = Array.isArray(d.loc) ? d.loc.slice(1).join(".") : "";
          return field ? `${field}: ${d.msg}` : (d.msg ?? "Invalid value");
        })
        .join("; ");
    }
  } catch {
    // body was not JSON
  }
  if (res.status === 404) return "Not found.";
  if (res.status === 409) return "This conflicts with existing data.";
  if (res.status === 422) return "Please check the values and try again.";
  if (res.status >= 500) return "The server had a problem. Please try again.";
  return `Request failed (${res.status}).`;
}

export async function apiRequest<T>(
  path: string,
  { method = "GET", body, query, signActor = false }: Options = {},
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "")
      url.searchParams.set(key, String(value));
  }

  let res: Response;
  try {
    const session = await getSession();
    if (signActor && (!session?.email || !INTERNAL_API_KEY)) {
      throw new ApiError(401, "A signed-in account is required for this action.");
    }
    const actorTimestamp = signActor ? String(Math.floor(Date.now() / 1000)) : "";
    const actorSignature = signActor
      ? createHmac("sha256", INTERNAL_API_KEY!)
          .update(`${method}\n${path}\n${session!.email}\n${actorTimestamp}`)
          .digest("hex")
      : "";
    res = await fetch(url, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(INTERNAL_API_KEY
          ? { "X-Internal-API-Key": INTERNAL_API_KEY }
          : {}),
        ...(session?.email ? { "X-User-Email": session.email } : {}),
        ...(signActor
          ? {
              "X-Actor-Timestamp": actorTimestamp,
              "X-Actor-Signature": actorSignature,
            }
          : {}),
        ...(session?.organizationId
          ? { "X-Organization-ID": String(session.organizationId) }
          : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      503,
      "Can't reach the API server. Check that it is running.",
    );
  }

  if (!res.ok) throw new ApiError(res.status, await readErrorMessage(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
