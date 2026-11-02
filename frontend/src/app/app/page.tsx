import { AlertTriangle, BedDouble, Building2, IndianRupee, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { formatDate, money } from "@/lib/format";
import type { Dashboard as DashboardData } from "@/lib/types";
import { AgingBars, TrendChart } from "@/components/charts";
import { Avatar, ButtonLink, Card, CardHeader, InvoiceStatusBadge, Notice, PageHeader, StatCard, Table, Td, Th } from "@/components/ui";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ welcome?: string; error?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const { totals, branches: branchRows, recentInvoices, trend, aging } = await api<DashboardData>("/dashboard");
  const overdue = { count: totals.overdueCount, due: totals.overdueAmount };

  return (
    <>
      <PageHeader
        title={`Good ${greeting()}, ${user.name.split(" ")[0]}`}
        description={`Here's how ${user.orgName} is doing today.`}
        actions={
          <>
            <ButtonLink href="/app/students/new" variant="secondary">
              Add student
            </ButtonLink>
            <ButtonLink href="/app/invoices/new">New invoice</ButtonLink>
          </>
        }
      />
      {sp.welcome && (
        <div className="mb-6">
          <Notice tone="success">
            Your hostel is set up. Next, <Link className="font-semibold underline" href="/app/branches">add rooms to your branch</Link>, then add students.
          </Notice>
        </div>
      )}
      {sp.error === "forbidden" && (
        <div className="mb-6">
          <Notice tone="error">Only the owner can open that page.</Notice>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active students" value={totals.students} hint={`${totals.branches} branch${totals.branches === 1 ? "" : "es"}`} icon={<Users className="size-5" />} />
        <StatCard label="Bed occupancy" value={`${totals.occupancyPct}%`} hint={`${totals.students} of ${totals.beds} beds filled`} icon={<BedDouble className="size-5" />} tone="sky" />
        <StatCard label="Collected this month" value={money(totals.collectedThisMonth)} hint={`Mess spend ${money(totals.messSpendThisMonth)}`} icon={<Wallet className="size-5" />} />
        <StatCard
          label="Outstanding dues"
          value={money(totals.outstanding)}
          hint={overdue.count ? `${overdue.count} overdue · ${money(overdue.due)}` : "Nothing overdue"}
          icon={<IndianRupee className="size-5" />}
          tone={overdue.count ? "rose" : "amber"}
        />
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Billed vs collected" description="Last 6 months, all branches you can see" />
          <TrendChart data={trend} />
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader
            title="Dues by age"
            description="How late unpaid balances are"
            action={<ButtonLink href="/app/invoices?status=overdue" variant="ghost">Overdue</ButtonLink>}
          />
          <AgingBars buckets={aging} />
        </Card>
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Branches" description="Occupancy and dues per branch" action={<ButtonLink href="/app/branches" variant="ghost">View all</ButtonLink>} />
          <Table>
            <thead>
              <tr>
                <Th>Branch</Th>
                <Th>Students</Th>
                <Th>Occupancy</Th>
                <Th className="text-right">Dues</Th>
              </tr>
            </thead>
            <tbody>
              {branchRows.map((b) => {
                const pct = b.beds ? Math.round((b.students / b.beds) * 100) : 0;
                return (
                  <tr key={b.id} className="hover:bg-ink-50/50">
                    <Td>
                      <Link href={`/app/branches/${b.id}`} className="flex items-center gap-3 font-medium text-ink-900 hover:text-brand-700">
                        <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
                          <Building2 className="size-4" />
                        </span>
                        <span>
                          {b.name}
                          <span className="block text-xs font-normal text-ink-500">{b.city ?? b.code}</span>
                        </span>
                      </Link>
                    </Td>
                    <Td className="tabular-nums">{b.students}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-100">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-ink-500">{pct}%</span>
                      </div>
                    </Td>
                    <Td className="text-right tabular-nums">{money(b.dues)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Recent invoices" action={<ButtonLink href="/app/invoices" variant="ghost">View all</ButtonLink>} />
          <ul className="divide-y divide-ink-100">
            {recentInvoices.map((inv) => (
              <li key={inv.id}>
                <Link href={`/app/invoices/${inv.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50/50">
                  <Avatar name={inv.studentName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{inv.studentName}</p>
                    <p className="text-xs text-ink-500">
                      {inv.number} · {formatDate(inv.issueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{money(inv.total)}</p>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                </Link>
              </li>
            ))}
            {recentInvoices.length === 0 && <li className="px-5 py-8 text-center text-sm text-ink-500">No invoices yet.</li>}
          </ul>
        </Card>
      </div>

      {overdue.count ? (
        <Card className="mt-6 flex flex-wrap items-center gap-4 border-amber-200 bg-amber-50/60 p-5">
          <AlertTriangle className="size-5 text-amber-600" />
          <p className="flex-1 text-sm text-amber-900">
            <b>{overdue.count} invoices</b> are past their due date, totalling <b>{money(overdue.due)}</b>.
          </p>
          <ButtonLink href="/app/invoices?status=overdue" variant="secondary">
            Review overdue
          </ButtonLink>
        </Card>
      ) : null}
    </>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}
