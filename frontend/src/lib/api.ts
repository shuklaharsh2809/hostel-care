import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/action-form";

/**
 * Server-side client for the HostelCare API (backend/).
 * Runs only in Server Components and Server Actions, so the token never reaches the browser.
 */
const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "") + "/api";
export const TOKEN_COOKIE = "hc_token";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  /** false = don't send the token and don't redirect on 401 (login/signup). */
  auth?: boolean;
};

export async function api<T>(path: string, { method = "GET", body, query, auth = true }: Options = {}): Promise<T> {
  const url = new URL(API_URL + path);
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));

  const headers: Record<string, string> = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (auth) {
    const token = (await cookies()).get(TOKEN_COOKIE)?.value;
    if (!token) redirect("/login");
    headers.authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  } catch {
    throw new ApiError(503, "Can't reach the HostelCare API. Is the backend running?");
  }
  if (res.status === 401 && auth) redirect("/login?expired=1");
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new ApiError(res.status, msg ?? `Request failed (${res.status})`);
  }
  return data as T;
}

/** For Server Actions: turn an ApiError into an inline form message; let redirects and other errors through. */
export async function attempt(fn: () => Promise<FormState | void>): Promise<FormState> {
  try {
    return (await fn()) ?? undefined;
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    throw e;
  }
}

/** Read helper for pages: 404 from the API becomes Next's not-found page. */
export async function apiOrNotFound<T>(path: string, opts?: Options): Promise<T> {
  try {
    return await api<T>(path, opts);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400 || e.status === 403)) {
      const { notFound } = await import("next/navigation");
      notFound();
    }
    throw e;
  }
}
