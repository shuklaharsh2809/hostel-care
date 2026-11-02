"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/action-form";
import { api, attempt } from "@/lib/api";
import { toPaise } from "@/lib/format";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function saveMenu(branchId: string, _: FormState, fd: FormData): Promise<FormState> {
  return attempt(async () => {
    const days = Array.from({ length: 7 }, (_, d) => ({
      dayOfWeek: d,
      breakfast: str(fd, `d${d}_breakfast`) || null,
      lunch: str(fd, `d${d}_lunch`) || null,
      snacks: str(fd, `d${d}_snacks`) || null,
      dinner: str(fd, `d${d}_dinner`) || null,
    }));
    await api(`/mess/${branchId}/menu`, { method: "PUT", body: { days } });
    revalidatePath("/app/mess");
    return { success: "Weekly menu saved" };
  });
}

export async function createPlan(branchId: string, _: FormState, fd: FormData): Promise<FormState> {
  return attempt(async () => {
    const name = str(fd, "name");
    await api(`/mess/${branchId}/plans`, {
      method: "POST",
      body: { name, description: str(fd, "description") || null, monthlyFee: toPaise(fd.get("monthlyFee")) },
    });
    revalidatePath("/app/mess");
    return { success: `Plan "${name}" added` };
  });
}

export async function togglePlan(planId: string, active: boolean) {
  await api(`/mess/plans/${planId}`, { method: "PATCH", body: { active } });
  revalidatePath("/app/mess");
}

export async function addExpense(branchId: string, _: FormState, fd: FormData): Promise<FormState> {
  return attempt(async () => {
    await api(`/mess/${branchId}/expenses`, {
      method: "POST",
      body: {
        spentOn: str(fd, "spentOn") || null,
        category: str(fd, "category"),
        description: str(fd, "description") || null,
        amount: toPaise(fd.get("amount")),
      },
    });
    revalidatePath("/app/mess");
    return { success: "Expense recorded" };
  });
}

export async function deleteExpense(expenseId: string) {
  await api(`/mess/expenses/${expenseId}`, { method: "DELETE" });
  revalidatePath("/app/mess");
}
