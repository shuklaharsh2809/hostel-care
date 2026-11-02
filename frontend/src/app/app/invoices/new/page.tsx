import type { Metadata } from "next";
import { createInvoiceAction } from "../actions";
import { InvoiceEditor } from "../invoice-editor";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import type { InvoiceStudentOption } from "@/lib/types";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  const { student } = await searchParams;
  const opts = await api<{
    students: InvoiceStudentOption[];
    defaultTaxPercent: number;
    defaults: { issueDate: string; dueDate: string; periodLabel: string };
  }>("/invoices/new-options");
  return (
    <>
      <PageHeader back={{ href: "/app/invoices", label: "Invoices" }} title="New invoice" />
      <InvoiceEditor
        action={createInvoiceAction}
        students={opts.students}
        defaultStudentId={student}
        defaultTaxPercent={opts.defaultTaxPercent}
        defaults={opts.defaults}
      />
    </>
  );
}
