import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { addExpense, createPlan, deleteExpense, saveMenu, togglePlan } from "./actions";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/action-form";
import { Badge, Button, ButtonLink, Card, CardHeader, EmptyState, Field, Input, PageHeader, Select, StatCard, Table, Td, Th, cx } from "@/components/ui";
import { api } from "@/lib/api";
import { canManage, requireUser } from "@/lib/auth";
import { DAYS, formatDate, money, todayISO } from "@/lib/format";
import type { MessOverview } from "@/lib/types";

export const metadata: Metadata = { title: "Mess" };
const CATEGORIES = ["Groceries", "Vegetables", "Milk & Dairy", "Meat & Eggs", "Gas Cylinder", "Staff Salary", "Utensils", "Other"];

export default async function MessPage({ searchParams }: { searchParams: Promise<{ branch?: string; month?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const data = await api<MessOverview>("/mess", { query: { branch: sp.branch, month: sp.month } });
  if (data.branch === null) {
    return (
      <>
        <PageHeader title="Mess" />
        <Card>
          <EmptyState
            title="No branch runs a mess yet"
            description='Turn on "This branch runs a mess" in a branch’s details to manage menus, plans and expenses.'
            action={<ButtonLink href="/app/branches">Go to branches</ButtonLink>}
          />
        </Card>
      </>
    );
  }

  const { branches: messBranches, branch, month, prevMonth: prev, nextMonth: next, menu, plans, expenses } = data;
  const { subscribers, expectedIncome, spent } = data.summary;
  const [y, m] = month.split("-").map(Number) as [number, number];
  const byCategory = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => ((acc[e.category] = (acc[e.category] ?? 0) + e.amount), acc), {}),
  ).sort((a, b) => b[1] - a[1]);
  const menuByDay = new Map(menu.map((d) => [d.dayOfWeek, d]));
  const todayIdx = (new Date().getDay() + 6) % 7;
  const manage = canManage(user);
  const monthName = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <>
      <PageHeader title="Mess" description="Menus, meal plans and kitchen expenses for each branch." />

      <div className="mb-6 flex flex-wrap gap-2">
        {messBranches.map((b) => (
          <Link
            key={b.id}
            href={`/app/mess?branch=${b.id}`}
            className={cx(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium",
              b.id === branch.id ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-600 hover:border-ink-300",
            )}
          >
            {b.name}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Mess subscribers" value={subscribers} />
        <StatCard label="Expected monthly income" value={money(expectedIncome)} tone="sky" />
        <StatCard label={`Spent in ${monthName}`} value={money(spent)} tone="amber" />
        <StatCard label="Net (income − spend)" value={money(expectedIncome - spent)} tone={expectedIncome - spent >= 0 ? "brand" : "rose"} />
      </div>

      <Card className="mt-6">
        <CardHeader title="Weekly menu" description={`Today is ${DAYS[todayIdx]}`} />
        <ActionForm action={saveMenu.bind(null, branch.id)}>
          <Table>
            <thead>
              <tr>
                <Th>Day</Th>
                <Th>Breakfast</Th>
                <Th>Lunch</Th>
                <Th>Snacks</Th>
                <Th>Dinner</Th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, i) => {
                const d = menuByDay.get(i);
                return (
                  <tr key={day} className={i === todayIdx ? "bg-brand-50/50" : undefined}>
                    <Td className="font-medium whitespace-nowrap text-ink-900">
                      {day} {i === todayIdx && <Badge tone="green">Today</Badge>}
                    </Td>
                    {(["breakfast", "lunch", "snacks", "dinner"] as const).map((meal) => (
                      <Td key={meal} className="min-w-44 py-2">
                        <Input name={`d${i}_${meal}`} defaultValue={d?.[meal] ?? ""} disabled={!manage} className="py-1.5" />
                      </Td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {manage && (
            <div className="flex justify-end p-4">
              <SubmitButton>Save menu</SubmitButton>
            </div>
          )}
        </ActionForm>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader title="Meal plans" description="Students pick a plan; it's added to their monthly invoice." />
          <ul className="divide-y divide-ink-100">
            {plans.map(({ subscribers, ...plan }) => (
              <li key={plan.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink-900">
                    {plan.name} {!plan.active && <Badge>Inactive</Badge>}
                  </p>
                  <p className="text-xs text-ink-500">
                    {money(plan.monthlyFee)}/month · {subscribers} student{subscribers === 1 ? "" : "s"}
                    {plan.description && ` · ${plan.description}`}
                  </p>
                </div>
                {manage && (
                  <form action={togglePlan.bind(null, plan.id, !plan.active)}>
                    <Button variant="ghost" className="text-xs">
                      {plan.active ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {manage && (
            <ActionForm action={createPlan.bind(null, branch.id)} resetOnSuccess className="grid grid-cols-2 gap-3 border-t border-ink-100 p-5">
              <Field label="Plan name" className="col-span-2">
                <Input name="name" required placeholder="e.g. Veg – 2 meals" />
              </Field>
              <Field label="Monthly fee (₹)">
                <Input name="monthlyFee" inputMode="decimal" required />
              </Field>
              <Field label="Includes">
                <Input name="description" placeholder="Lunch + dinner" />
              </Field>
              <SubmitButton variant="secondary" className="col-span-2">
                Add plan
              </SubmitButton>
            </ActionForm>
          )}
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader
            title={`Expenses · ${monthName}`}
            action={
              <div className="flex gap-1">
                <ButtonLink variant="ghost" href={`/app/mess?branch=${branch.id}&month=${prev}`}>
                  ←
                </ButtonLink>
                <ButtonLink variant="ghost" href={`/app/mess?branch=${branch.id}&month=${next}`}>
                  →
                </ButtonLink>
              </div>
            }
          />
          {byCategory.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b border-ink-100 px-5 py-3">
              {byCategory.map(([cat, amt]) => (
                <span key={cat} className="rounded-md bg-ink-50 px-2 py-1 text-xs text-ink-600">
                  {cat}: <b className="text-ink-900">{money(amt)}</b>
                </span>
              ))}
            </div>
          )}
          {manage && (
            <ActionForm action={addExpense.bind(null, branch.id)} resetOnSuccess className="grid gap-3 border-b border-ink-100 p-5 sm:grid-cols-5">
              <Input name="spentOn" type="date" defaultValue={todayISO()} aria-label="Date" />
              <Select name="category" aria-label="Category">
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
              <Input name="description" placeholder="Details" aria-label="Details" className="sm:col-span-1" />
              <Input name="amount" inputMode="decimal" placeholder="Amount ₹" required aria-label="Amount" />
              <SubmitButton>Add</SubmitButton>
            </ActionForm>
          )}
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Category</Th>
                <Th>Details</Th>
                <Th className="text-right">Amount</Th>
                {manage && <Th />}
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <Td className="whitespace-nowrap">{formatDate(e.spentOn)}</Td>
                  <Td>{e.category}</Td>
                  <Td className="text-ink-500">{e.description ?? "—"}</Td>
                  <Td className="text-right tabular-nums">{money(e.amount)}</Td>
                  {manage && (
                    <Td className="w-10 py-1">
                      <form action={deleteExpense.bind(null, e.id)}>
                        <ConfirmButton variant="ghost" message="Delete this expense?" className="px-2!">
                          <Trash2 className="size-4" />
                        </ConfirmButton>
                      </form>
                    </Td>
                  )}
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <Td colSpan={5} className="py-8 text-center text-ink-500">
                    No expenses recorded for {monthName}.
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
