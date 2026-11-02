import { Trash2 } from "lucide-react";
import Link from "next/link";
import { deletePayment, recordPayment, voidInvoice } from "../actions";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/action-form";
import { PrintButton } from "@/components/print-button";
import { Card, CardHeader, Field, Input, InvoiceStatusBadge, PageHeader, Select } from "@/components/ui";
import { apiOrNotFound } from "@/lib/api";
import { canManage, requireUser } from "@/lib/auth";
import { formatDate, money, rupees, todayISO } from "@/lib/format";
import type { InvoiceDetail } from "@/lib/types";

const METHOD = { cash: "Cash", upi: "UPI", bank_transfer: "Bank transfer", card: "Card", cheque: "Cheque" } as const;

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { invoice: inv, student, branch, organization: org, roomNumber, items, payments: pays } = await apiOrNotFound<InvoiceDetail>(`/invoices/${id}`);
  const balance = inv.total - inv.amountPaid;
  const manage = canManage(user);
  const open = inv.status !== "void" && balance > 0;

  return (
    <>
      <div className="no-print">
        <PageHeader
          back={{ href: "/app/invoices", label: "Invoices" }}
          title={
            <span className="flex items-center gap-3">
              {inv.number} <InvoiceStatusBadge status={inv.status} />
            </span>
          }
          description={
            <>
              For{" "}
              <Link href={`/app/students/${student.id}`} className="text-brand-700 hover:underline">
                {student.fullName}
              </Link>{" "}
              · {branch.name}
            </>
          }
          actions={
            <>
              <PrintButton />
              {user.role === "owner" && inv.status !== "void" && inv.amountPaid === 0 && (
                <form action={voidInvoice.bind(null, id)}>
                  <ConfirmButton message="Void this invoice? It will no longer count towards dues.">Void</ConfirmButton>
                </form>
              )}
            </>
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Printable invoice */}
        <Card className="print-sheet p-6 sm:p-10 xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="font-display text-2xl font-bold tracking-tight text-brand-700">{org.name}</p>
              <p className="text-sm text-ink-500">{branch.name}</p>
              <p className="max-w-64 text-sm text-ink-500">{[branch.address, branch.city].filter(Boolean).join(", ") || org.address}</p>
              <p className="text-sm text-ink-500">{[org.phone ?? branch.phone, org.email].filter(Boolean).join(" · ")}</p>
              {org.gstin && <p className="text-sm text-ink-500">GSTIN: {org.gstin}</p>}
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-bold tracking-tight text-ink-900">INVOICE</p>
              <p className="mt-1 text-sm font-medium text-ink-700">{inv.number}</p>
              <dl className="mt-4 space-y-0.5 text-sm">
                <div className="flex justify-end gap-3">
                  <dt className="text-ink-500">Issued</dt>
                  <dd>{formatDate(inv.issueDate)}</dd>
                </div>
                <div className="flex justify-end gap-3">
                  <dt className="text-ink-500">Due</dt>
                  <dd>{formatDate(inv.dueDate)}</dd>
                </div>
                {inv.periodLabel && (
                  <div className="flex justify-end gap-3">
                    <dt className="text-ink-500">Period</dt>
                    <dd>{inv.periodLabel}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="mt-8 rounded-lg bg-ink-50 p-4">
            <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Bill to</p>
            <p className="mt-1 font-semibold text-ink-900">{student.fullName}</p>
            <p className="text-sm text-ink-600">
              {roomNumber ? `Room ${roomNumber}, ` : ""}
              {branch.name}
            </p>
            <p className="text-sm text-ink-600">{[student.phone, student.email].filter(Boolean).join(" · ")}</p>
          </div>

          <table className="mt-8 w-full text-sm">
            <thead>
              <tr className="border-b-2 border-ink-900 text-left">
                <th className="py-2 font-semibold">Description</th>
                <th className="py-2 text-right font-semibold">Qty</th>
                <th className="py-2 text-right font-semibold">Rate</th>
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-ink-100">
                  <td className="py-3 pr-4">{it.description}</td>
                  <td className="py-3 text-right tabular-nums">{it.quantity}</td>
                  <td className="py-3 text-right tabular-nums">{money(it.unitPrice)}</td>
                  <td className="py-3 text-right tabular-nums">{money(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 ml-auto max-w-xs space-y-1.5 text-sm">
            <Row k="Subtotal" v={money(inv.subtotal)} />
            {inv.discount > 0 && <Row k="Discount" v={`− ${money(inv.discount)}`} />}
            {inv.taxPercent > 0 && <Row k={`GST (${inv.taxPercent}%)`} v={money(inv.taxAmount)} />}
            <div className="flex justify-between border-t-2 border-ink-900 pt-2 text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">{money(inv.total)}</span>
            </div>
            <Row k="Paid" v={money(inv.amountPaid)} />
            <div className="flex justify-between rounded-md bg-brand-50 px-2 py-1.5 font-semibold text-brand-900">
              <span>Balance due</span>
              <span className="tabular-nums">{inv.status === "void" ? "—" : money(balance)}</span>
            </div>
          </div>

          {inv.notes && (
            <div className="mt-8 border-t border-ink-100 pt-4 text-sm text-ink-600">
              <p className="font-semibold text-ink-800">Notes</p>
              <p className="whitespace-pre-line">{inv.notes}</p>
            </div>
          )}
          <p className="mt-10 text-center text-xs text-ink-400">Thank you! This is a computer-generated invoice.</p>
        </Card>

        <div className="no-print space-y-6">
          {manage && open && (
            <Card>
              <CardHeader title="Record payment" description={`Balance: ${money(balance)}`} />
              <ActionForm action={recordPayment.bind(null, id)} resetOnSuccess className="grid grid-cols-2 gap-4 p-5">
                <Field label="Amount (₹)" className="col-span-2">
                  <Input name="amount" inputMode="decimal" defaultValue={rupees(balance)} required />
                </Field>
                <Field label="Method">
                  <Select name="method" defaultValue="upi">
                    {Object.entries(METHOD).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Date">
                  <Input name="paidOn" type="date" defaultValue={todayISO()} />
                </Field>
                <Field label="Reference / UTR" className="col-span-2">
                  <Input name="reference" placeholder="Optional" />
                </Field>
                <SubmitButton className="col-span-2">Record payment</SubmitButton>
              </ActionForm>
            </Card>
          )}
          <Card>
            <CardHeader title="Payment history" />
            <ul className="divide-y divide-ink-100">
              {pays.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <div className="flex-1">
                    <p className="font-medium text-ink-900 tabular-nums">{money(p.amount)}</p>
                    <p className="text-xs text-ink-500">
                      {METHOD[p.method]} · {formatDate(p.paidOn)}
                      {p.reference && ` · ${p.reference}`}
                    </p>
                  </div>
                  {user.role === "owner" && (
                    <form action={deletePayment.bind(null, p.id, id)}>
                      <ConfirmButton variant="ghost" message="Delete this payment record?" className="px-2!">
                        <Trash2 className="size-4" />
                      </ConfirmButton>
                    </form>
                  )}
                </li>
              ))}
              {pays.length === 0 && <li className="px-5 py-6 text-center text-sm text-ink-500">No payments yet.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-ink-600">
      <span>{k}</span>
      <span className="tabular-nums">{v}</span>
    </div>
  );
}
