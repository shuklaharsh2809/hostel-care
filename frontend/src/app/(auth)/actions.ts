"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/components/action-form";
import { api, attempt } from "@/lib/api";
import { clearSessionToken, setSessionToken } from "@/lib/auth";

type AuthResponse = { token: string };
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export async function signup(_: FormState, fd: FormData): Promise<FormState> {
  const res = await attempt(async () => {
    const { token } = await api<AuthResponse>("/auth/signup", {
      method: "POST",
      auth: false,
      body: {
        hostelName: str(fd, "hostelName"),
        branchName: str(fd, "branchName"),
        city: str(fd, "city") || null,
        name: str(fd, "name"),
        email: str(fd, "email"),
        password: str(fd, "password"),
      },
    });
    await setSessionToken(token);
  });
  if (res?.error) return res;
  redirect("/app?welcome=1");
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const res = await attempt(async () => {
    const { token } = await api<AuthResponse>("/auth/login", {
      method: "POST",
      auth: false,
      body: { email: str(fd, "email"), password: str(fd, "password") },
    });
    await setSessionToken(token);
  });
  if (res?.error) return res;
  redirect("/app");
}

export async function logout() {
  await clearSessionToken();
  redirect("/login");
}
