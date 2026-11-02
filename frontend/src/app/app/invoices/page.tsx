import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Button, ButtonLink, Card, EmptyState, Input, InvoiceStatusBadge, PageHeader, Select, StatCard, Table, Td, Th, cx } from "@/components/ui";
import { api } from "@/lib/api";
import type { BranchWithCounts, InvoiceList } from "@/lib/types";
import { formatDate, money, todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Invoices" };
const PAGE_SIZE = 30;
const TABS = [
  ["all", "All"],
  ["unpaid", "Unpaid"],
  ["overdue", "Overdue"],
  ["paid", "Paid"],
  ["void", "Void"],
] as const;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; branch?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.status) ? sp.status! : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim();
  const today = todayISO();
  const [{ rows, total, summary }, branchList] = await Promise.all([
    api<InvoiceList>("/invoices", { query: { status: tab, branch: sp.branch, q, page, pageSize: PAGE_SIZE } }),
    api<BranchWithCounts[]>("/branches"),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged = { status: tab, branch: sp.branch, q, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "status" && v === "all")) u.set(k, v);
    return `/app/invoices?${u}`;
  };

  return (
    <>
      <PageHeader
        title="Invoices & Payments"
        description="Bill students for rent, mess and anything else, and track what's been paid."
        actions={
          <>
            <ButtonLink href="/app/invoices/bulk" variant="secondary">
              Monthly billing run
            </ButtonLink>
            <ButtonLink href="/app/invoices/new">New invoice</ButtonLink>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total billed" value={money(summary.billed)} />
        <StatCard label="Collected" value={money(summary.collected)} tone="sky" />
        <StatCard label="Outstanding" value={money(summary.outstanding)} tone="amber" />
        <StatCard label="Overdue" value={money(summary.overdue)} tone="rose" />
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center gap-1 border-b border-ink-100 px-4 pt-3">
          {TABS.map(([k, label]) => (
            <Link
              key={k}
              href={link({ status: k, page: undefined })}
              className={cx("-mb-px border-b-2 px-3 py-2 text-sm font-medium", tab === k ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800")}
            >
              {label}
            </Link>
          ))}
        </div>
        <form className="flex flex-wrap gap-3 border-b border-ink-100 p-4">
          <input type="hidden" name="status" value={tab} />
          <Input name="q" defaultValue={q} placeholder="Search invoice no., student, period…" className="min-w-56 flex-1" />
          <Select name="branch" defaultValue={sp.branch ?? ""} className="w-auto">
            <option value="">All branches</option>
            {branchList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
        {rows.length === 0 ? (
          <EmptyState title="No invoices here" description="Create an invoice or run monthly billing for a branch." action={<ButtonLink href="/app/invoices/new">New invoice</ButtonLink>} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Invoice</Th>
                <Th>Student</Th>
                <Th>Period</Th>
                <Th>Due</Th>
                <Th>Status</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Balance</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => {
                const { studentName, branchCode } = inv;
                const overdue = (inv.status === "issued" || inv.status === "partially_paid") && inv.dueDate && inv.dueDate < today;
                return (
                  <tr key={inv.id} className="hover:bg-ink-50/50">
                    <Td>
                      <Link href={`/app/invoices/${inv.id}`} className="font-medium text-ink-900 hover:text-brand-700">
                        {inv.number}
                      </Link>
                      <span className="block text-xs text-ink-500">
                        {formatDate(inv.issueDate)} · {branchCode}
                      </span>
                    </Td>
                    <Td>
                      <span className="flex items-center gap-2">
                        <Avatar name={studentName} className="size-7 text-[10px]" />
                        {studentName}
                      </span>
                    </Td>
                    <Td>{inv.periodLabel ?? "—"}</Td>
                    <Td className={cx("whitespace-nowrap", overdue && "font-medium text-red-700")}>{formatDate(inv.dueDate)}</Td>
                    <Td>
                      <InvoiceStatusBadge status={inv.status} />
                    </Td>
                    <Td className="text-right tabular-nums">{money(inv.total)}</Td>
                    <Td className="text-right font-medium tabular-nums">{inv.status === "void" ? "—" : money(inv.total - inv.amountPaid)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 text-sm text-ink-500">
            <span>
              Page {page} of {pages} · {total} invoices
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <ButtonLink variant="secondary" href={link({ page: String(page - 1) })}>
                  Previous
                </ButtonLink>
              )}
              {page < pages && (
                <ButtonLink variant="secondary" href={link({ page: String(page + 1) })}>
                  Next
                </ButtonLink>
              )}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
