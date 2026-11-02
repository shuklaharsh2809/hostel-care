import type { Metadata } from "next";
import { updateOrganization } from "../team/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, CardHeader, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import type { Organization } from "@/lib/types";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireOwner();
  const org = await api<Required<Organization>>("/organization");
  return (
    <>
      <PageHeader title="Settings" description="Business details shown on every invoice." />
      <Card className="max-w-3xl">
        <CardHeader title="Business & invoicing" />
        <ActionForm action={updateOrganization} className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Business name" className="sm:col-span-2">
            <Input name="name" required defaultValue={org.name} />
          </Field>
          <Field label="Billing email">
            <Input name="email" type="email" defaultValue={org.email ?? ""} />
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={org.phone ?? ""} />
          </Field>
          <Field label="Registered address" className="sm:col-span-2">
            <Textarea name="address" rows={2} defaultValue={org.address ?? ""} />
          </Field>
          <Field label="GSTIN" hint="Leave blank if not registered">
            <Input name="gstin" defaultValue={org.gstin ?? ""} className="uppercase" />
          </Field>
          <Field label="Default GST %" hint="Applied to new invoices; 0 for none">
            <Input name="defaultTaxPercent" type="number" min={0} max={28} defaultValue={org.defaultTaxPercent} />
          </Field>
          <Field label="Invoice number prefix" hint={`Next invoice: ${org.invoicePrefix}-${String(org.nextInvoiceNumber).padStart(6, "0")}`}>
            <Input name="invoicePrefix" required defaultValue={org.invoicePrefix} className="uppercase" />
          </Field>
          <div className="flex items-end justify-end">
            <SubmitButton>Save settings</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
