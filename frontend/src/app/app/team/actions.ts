"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/action-form";
import { api, attempt } from "@/lib/api";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function addMember(_: FormState, fd: FormData): Promise<FormState> {
  return attempt(async () => {
    const body = {
      name: str(fd, "name"),
      email: str(fd, "email"),
      password: String(fd.get("password") ?? ""),
      role: str(fd, "role"),
      branchId: str(fd, "branchId") || null,
    };
    await api("/team", { method: "POST", body });
    revalidatePath("/app/team");
    return { success: `${body.name} can now log in with ${body.email}` };
  });
}

export async function removeMember(userId: string) {
  await api(`/team/${userId}`, { method: "DELETE" });
  revalidatePath("/app/team");
}

export async function updateOrganization(_: FormState, fd: FormData): Promise<FormState> {
  return attempt(async () => {
    await api("/organization", {
      method: "PATCH",
      body: {
        name: str(fd, "name"),
        email: str(fd, "email") || null,
        phone: str(fd, "phone") || null,
        address: str(fd, "address") || null,
        gstin: str(fd, "gstin") || null,
        invoicePrefix: str(fd, "invoicePrefix"),
        defaultTaxPercent: Number(fd.get("defaultTaxPercent")) || 0,
      },
    });
    revalidatePath("/app", "layout");
    return { success: "Settings saved" };
  });
}
