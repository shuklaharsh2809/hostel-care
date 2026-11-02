import type { Metadata } from "next";
import { bulkGenerate } from "../actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, CardHeader, Field, Input, Notice, PageHeader, Select } from "@/components/ui";
import { api } from "@/lib/api";

export const metadata: Metadata = { title: "Monthly billing run" };

export default async function BulkPage() {
  const { branches: list, defaults } = await api<{
    branches: { id: string; name: string; activeStudents: number }[];
    defaults: { periodLabel: string; issueDate: string; dueDate: string };
  }>("/invoices/bulk-options");

  return (
    <>
      <PageHeader
        back={{ href: "/app/invoices", label: "Invoices" }}
        title="Monthly billing run"
        description="Create rent + mess invoices for every active student in a branch in one go."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Generate invoices" />
          <ActionForm action={bulkGenerate} className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Branch" className="sm:col-span-2">
              <Select name="branchId" required>
                {list.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.activeStudents} active students)
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Billing period" hint="Students already billed for this period are skipped" className="sm:col-span-2">
              <Input name="periodLabel" required defaultValue={defaults.periodLabel} />
            </Field>
            <Field label="Issue date">
              <Input name="issueDate" type="date" defaultValue={defaults.issueDate} required />
            </Field>
            <Field label="Due date">
              <Input name="dueDate" type="date" defaultValue={defaults.dueDate} />
            </Field>
            <div className="flex flex-wrap gap-6 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="includeRent" defaultChecked className="size-4 accent-brand-600" /> Room rent
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="includeMess" defaultChecked className="size-4 accent-brand-600" /> Mess plan fee
              </label>
            </div>
            <div className="sm:col-span-2">
              <SubmitButton pendingText="Generating…">Generate invoices</SubmitButton>
            </div>
          </ActionForm>
        </Card>
        <div className="space-y-4">
          <Notice tone="info">
            Each invoice uses the student&apos;s own monthly rent and their selected mess plan. Edit a student&apos;s profile first if their rent has changed.
          </Notice>
          <Notice tone="info">It&apos;s safe to run this more than once: students already billed for the same period are skipped.</Notice>
        </div>
      </div>
    </>
  );
}
