"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/action-form";
import { api, attempt } from "@/lib/api";
import { toPaise } from "@/lib/format";
import type { Invoice } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function createInvoiceAction(_: FormState, fd: FormData): Promise<FormState> {
  let id = "";
  const res = await attempt(async () => {
    let items: unknown;
    try {
      items = JSON.parse(str(fd, "items") || "[]");
    } catch {
      return { error: "Line items are invalid" };
    }
    const inv = await api<Invoice>("/invoices", {
      method: "POST",
      body: {
        studentId: str(fd, "studentId"),
        items,
        discount: toPaise(fd.get("discount")),
        taxPercent: Number(fd.get("taxPercent")) || 0,
        issueDate: str(fd, "issueDate") || null,
        dueDate: str(fd, "dueDate") || null,
        periodLabel: str(fd, "periodLabel") || null,
        notes: str(fd, "notes") || null,
      },
    });
    id = inv.id;
  });
  if (res?.error) return res;
  redirect(`/app/invoices/${id}`);
}

export async function recordPayment(invoiceId: string, _: FormState, fd: FormData): Promise<FormState> {
  return attempt(async () => {
    await api(`/invoices/${invoiceId}/payments`, {
      method: "POST",
      body: {
        amount: toPaise(fd.get("amount")),
        method: str(fd, "method"),
        reference: str(fd, "reference") || null,
        paidOn: str(fd, "paidOn") || null,
      },
    });
    revalidatePath(`/app/invoices/${invoiceId}`);
    return { success: "Payment recorded" };
  });
}

export async function deletePayment(paymentId: string, invoiceId: string) {
  await api(`/payments/${paymentId}`, { method: "DELETE" });
  revalidatePath(`/app/invoices/${invoiceId}`);
}

export async function voidInvoice(invoiceId: string) {
  await api(`/invoices/${invoiceId}/void`, { method: "POST" });
  revalidatePath(`/app/invoices/${invoiceId}`);
}

export async function bulkGenerate(_: FormState, fd: FormData): Promise<FormState> {
  return attempt(async () => {
    const r = await api<{ created: number; skipped: number; branchName: string }>("/invoices/bulk", {
      method: "POST",
      body: {
        branchId: str(fd, "branchId"),
        periodLabel: str(fd, "periodLabel"),
        issueDate: str(fd, "issueDate"),
        dueDate: str(fd, "dueDate") || null,
        includeRent: fd.get("includeRent") === "on",
        includeMess: fd.get("includeMess") === "on",
      },
    });
    revalidatePath("/app/invoices");
    return {
      success: `Created ${r.created} invoice${r.created === 1 ? "" : "s"} for ${r.branchName}.${r.skipped ? ` Skipped ${r.skipped} (already billed for this period or nothing to bill).` : ""}`,
    };
  });
}
