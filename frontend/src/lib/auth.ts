import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { api, TOKEN_COOKIE } from "./api";
import type { User } from "./types";

/** The signed-in user, fetched once per request from the API. */
export const requireUser = cache(async (): Promise<User> => {
  if (!(await cookies()).get(TOKEN_COOKIE)) redirect("/login");
  return api<User>("/auth/me");
});

export async function requireOwner() {
  const user = await requireUser();
  if (user.role !== "owner") redirect("/app?error=forbidden");
  return user;
}

/** UI hint only; the API enforces permissions. */
export function canManage(user: User) {
  return user.role === "owner" || user.role === "manager";
}

export async function setSessionToken(token: string) {
  (await cookies()).set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionToken() {
  (await cookies()).delete(TOKEN_COOKIE);
}
