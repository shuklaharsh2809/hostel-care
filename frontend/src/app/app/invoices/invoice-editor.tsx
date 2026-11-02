"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ActionForm, SubmitButton, type FormAction } from "@/components/action-form";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { computeTotals } from "@/lib/billing-math";
import { money } from "@/lib/format";

type StudentOpt = {
  id: string;
  fullName: string;
  branchName: string;
  roomNumber: string | null;
  monthlyRent: number;
  planName: string | null;
  planFee: number | null;
};
type Line = { key: number; description: string; quantity: string; unitPrice: string };

const toPaise = (v: string) => Math.round((Number(v.replace(/,/g, "")) || 0) * 100);

export function InvoiceEditor({
  action,
  students,
  defaultStudentId,
  defaultTaxPercent,
  defaults,
}: {
  action: FormAction;
  students: StudentOpt[];
  defaultStudentId?: string;
  defaultTaxPercent: number;
  defaults: { issueDate: string; dueDate: string; periodLabel: string };
}) {
  const [studentId, setStudentId] = useState(defaultStudentId ?? "");
  const [period, setPeriod] = useState(defaults.periodLabel);
  const [lines, setLines] = useState<Line[]>(() => linesFor(students.find((s) => s.id === defaultStudentId), defaults.periodLabel));
  const [discount, setDiscount] = useState("");
  const [tax, setTax] = useState(String(defaultTaxPercent));

  const items = lines.map((l) => ({ description: l.description, quantity: Number(l.quantity) || 0, unitPrice: toPaise(l.unitPrice) }));
  const totals = useMemo(() => computeTotals(items, toPaise(discount), Number(tax) || 0), [items, discount, tax]);

  function pickStudent(id: string) {
    setStudentId(id);
    setLines(linesFor(students.find((s) => s.id === id), period));
  }
  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  return (
    <ActionForm action={action} className="grid gap-6 lg:grid-cols-3">
      <input type="hidden" name="items" value={JSON.stringify(items.filter((i) => i.description.trim()))} />
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader title="Bill to" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Student" className="sm:col-span-2">
              <Select name="studentId" value={studentId} onChange={(e) => pickStudent(e.target.value)} required>
                <option value="">Select a student…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} — {s.branchName}
                    {s.roomNumber ? `, Room ${s.roomNumber}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Billing period" hint="Used to avoid double-billing in bulk runs">
              <Input name="periodLabel" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. November 2026" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Issue date">
                <Input name="issueDate" type="date" defaultValue={defaults.issueDate} />
              </Field>
              <Field label="Due date">
                <Input name="dueDate" type="date" defaultValue={defaults.dueDate} />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Line items"
            description="Rent and mess are pre-filled from the student's profile. Add deposits, fines, laundry, electricity, etc."
          />
          <div className="space-y-3 p-5">
            <div className="hidden grid-cols-12 gap-3 text-xs font-semibold tracking-wide text-ink-500 uppercase sm:grid">
              <span className="col-span-6">Description</span>
              <span className="col-span-2">Qty</span>
              <span className="col-span-3">Unit price (₹)</span>
            </div>
            {lines.map((l) => (
              <div key={l.key} className="grid grid-cols-12 gap-3">
                <Input className="col-span-12 sm:col-span-6" value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} placeholder="Description" />
                <Input className="col-span-3 sm:col-span-2" value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} inputMode="numeric" />
                <Input className="col-span-7 sm:col-span-3" value={l.unitPrice} onChange={(e) => update(l.key, { unitPrice: e.target.value })} inputMode="decimal" placeholder="0" />
                <Button type="button" variant="ghost" className="col-span-2 sm:col-span-1" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove line">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setLines((ls) => [...ls, blank()])}>
                <Plus className="size-4" /> Add line
              </Button>
              {["Security deposit", "Electricity charges", "Laundry", "Late fee"].map((label) => (
                <Button key={label} type="button" variant="ghost" className="text-xs" onClick={() => setLines((ls) => [...ls, { ...blank(), description: label }])}>
                  + {label}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Notes" />
          <div className="p-5">
            <Textarea name="notes" placeholder="Payment instructions, UPI ID, bank details…" />
          </div>
        </Card>
      </div>

      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader title="Summary" />
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount (₹)">
              <Input name="discount" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Tax / GST %">
              <Input name="taxPercent" inputMode="numeric" value={tax} onChange={(e) => setTax(e.target.value)} />
            </Field>
          </div>
          <dl className="space-y-2 border-t border-ink-100 pt-4 text-sm">
            <Row k="Subtotal" v={money(totals.subtotal)} />
            {toPaise(discount) > 0 && <Row k="Discount" v={`− ${money(toPaise(discount))}`} />}
            {totals.taxAmount > 0 && <Row k={`Tax (${tax}%)`} v={money(totals.taxAmount)} />}
            <div className="flex justify-between border-t border-ink-100 pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(totals.total)}</dd>
            </div>
          </dl>
          <SubmitButton className="w-full" pendingText="Creating invoice…">
            Create invoice
          </SubmitButton>
        </div>
      </Card>
    </ActionForm>
  );
}

let seq = 0;
function blank(): Line {
  return { key: ++seq, description: "", quantity: "1", unitPrice: "" };
}
function linesFor(s: StudentOpt | undefined, period: string): Line[] {
  if (!s) return [blank()];
  const out: Line[] = [];
  if (s.monthlyRent > 0)
    out.push({ ...blank(), description: `Room rent – ${period}${s.roomNumber ? ` (Room ${s.roomNumber})` : ""}`, unitPrice: String(s.monthlyRent / 100) });
  if (s.planName && s.planFee) out.push({ ...blank(), description: `Mess – ${s.planName} – ${period}`, unitPrice: String(s.planFee / 100) });
  return out.length ? out : [blank()];
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-ink-600">
      <dt>{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}
