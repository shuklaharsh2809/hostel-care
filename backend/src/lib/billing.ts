import { and, eq, sql } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { invoiceItems, invoices, organizations, payments } from "../db/schema.js";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
type Executor = DB | Tx;

import { computeTotals, type LineItemInput } from "./billing-math.js";
export { computeTotals, type LineItemInput };

export type CreateInvoiceInput = {
  orgId: string;
  branchId: string;
  studentId: string;
  items: LineItemInput[];
  discount?: number;
  taxPercent?: number;
  issueDate?: string;
  dueDate?: string | null;
  periodLabel?: string | null;
  notes?: string | null;
};

/** Atomically reserve the next invoice number for an organization (e.g. "SUN-000042"). */
async function nextInvoiceNumber(tx: Executor, orgId: string) {
  const [row] = await tx
    .update(organizations)
    .set({ nextInvoiceNumber: sql`${organizations.nextInvoiceNumber} + 1` })
    .where(eq(organizations.id, orgId))
    .returning({ n: organizations.nextInvoiceNumber, prefix: organizations.invoicePrefix });
  const n = row!.n - 1;
  return `${row!.prefix}-${String(n).padStart(6, "0")}`;
}

export async function createInvoice(tx: Executor, input: CreateInvoiceInput) {
  const items = input.items.filter((i) => i.description.trim() && i.quantity > 0);
  if (items.length === 0) throw new Error("An invoice needs at least one line item");
  const discount = input.discount ?? 0;
  const taxPercent = input.taxPercent ?? 0;
  const totals = computeTotals(items, discount, taxPercent);
  const number = await nextInvoiceNumber(tx, input.orgId);

  const [invoice] = await tx
    .insert(invoices)
    .values({
      orgId: input.orgId,
      branchId: input.branchId,
      studentId: input.studentId,
      number,
      status: "issued",
      issueDate: input.issueDate,
      dueDate: input.dueDate ?? null,
      periodLabel: input.periodLabel ?? null,
      notes: input.notes ?? null,
      discount,
      taxPercent,
      ...totals,
    })
    .returning();

  await tx.insert(invoiceItems).values(
    items.map((i, position) => ({
      invoiceId: invoice!.id,
      description: i.description.trim(),
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      amount: i.quantity * i.unitPrice,
      position,
    })),
  );
  return invoice!;
}

/** Recalculate amountPaid + status from the payments table. */
export async function refreshInvoicePaymentStatus(tx: Executor, orgId: string, invoiceId: string) {
  const [{ paid }] = (await tx
    .select({ paid: sql<number>`coalesce(sum(${payments.amount}), 0)::int` })
    .from(payments)
    .where(and(eq(payments.invoiceId, invoiceId), eq(payments.orgId, orgId)))) as [{ paid: number }];

  const [inv] = await tx
    .select({ total: invoices.total, status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)));
  if (!inv || inv.status === "void") return;

  const status = paid <= 0 ? "issued" : paid >= inv.total ? "paid" : "partially_paid";
  await tx
    .update(invoices)
    .set({ amountPaid: paid, status })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)));
}
