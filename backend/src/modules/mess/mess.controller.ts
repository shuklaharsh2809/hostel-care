import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { assertBranchAccess, CurrentUser, requireManage, scoped, type AuthUser } from "../../common/auth.js";
import { todayISO } from "../../common/format.js";
import { optDate, optText, paise } from "../../common/schemas.js";
import { db } from "../../db/index.js";
import { branches, messExpenses, messMenus, messPlans } from "../../db/schema.js";

const meal = z.string().trim().nullish().transform((v) => v || null);
const MenuBody = z.object({
  days: z
    .array(z.object({ dayOfWeek: z.number().int().min(0).max(6), breakfast: meal, lunch: meal, snacks: meal, dinner: meal }))
    .length(7, "Send all 7 days"),
});
const PlanBody = z.object({ name: z.string().trim().min(2, "Plan name is required"), description: optText, monthlyFee: paise });
const PlanPatch = z.object({ active: z.boolean() });
const ExpenseBody = z.object({
  spentOn: optDate.transform((v) => v ?? todayISO()),
  category: z.string().trim().min(1, "Category is required"),
  description: optText,
  amount: paise.refine((v) => v > 0, "Amount must be more than zero"),
});
const OverviewQuery = z.object({
  branch: z.string().uuid().optional().or(z.literal("")),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional()
    .or(z.literal("")),
});

/** Mess branch must exist in this org, be visible to the user, and run a mess. */
async function messBranch(user: AuthUser, branchId: string) {
  assertBranchAccess(user, branchId);
  const [b] = await db.select().from(branches).where(and(eq(branches.id, branchId), eq(branches.orgId, user.orgId)));
  if (!b) throw new NotFoundException("Branch not found");
  return b;
}

@Controller("mess")
export class MessController {
  /** Everything the mess screen needs for one branch and month. */
  @Get()
  async overview(@CurrentUser() user: AuthUser, @Query({ schema: OverviewQuery }) qs: z.infer<typeof OverviewQuery>) {
    const messBranches = await db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(and(scoped(user, branches.orgId, branches.id), eq(branches.hasMess, true)))
      .orderBy(branches.createdAt);
    if (messBranches.length === 0) return { branches: [], branch: null };

    const branch = messBranches.find((b) => b.id === qs.branch) ?? messBranches[0]!;
    const month = qs.month || todayISO().slice(0, 7);
    const [y, m] = month.split("-").map(Number) as [number, number];
    const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
    const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);

    const [menu, plans, expenses] = await Promise.all([
      db.select().from(messMenus).where(eq(messMenus.branchId, branch.id)).orderBy(asc(messMenus.dayOfWeek)),
      db
        .select({
          plan: messPlans,
          subscribers: sql<number>`(select count(*)::int from students s where s.mess_plan_id = "mess_plans"."id" and s.status = 'active')`,
        })
        .from(messPlans)
        .where(eq(messPlans.branchId, branch.id))
        .orderBy(desc(messPlans.active), messPlans.createdAt),
      db
        .select()
        .from(messExpenses)
        .where(and(eq(messExpenses.branchId, branch.id), gte(messExpenses.spentOn, `${month}-01`), lt(messExpenses.spentOn, `${next}-01`)))
        .orderBy(desc(messExpenses.spentOn), desc(messExpenses.createdAt)),
    ]);

    const subscribers = plans.reduce((s, p) => s + p.subscribers, 0);
    const expectedIncome = plans.reduce((s, p) => s + p.subscribers * p.plan.monthlyFee, 0);
    const spent = expenses.reduce((s, e) => s + e.amount, 0);
    return {
      branches: messBranches,
      branch,
      month,
      prevMonth: prev,
      nextMonth: next,
      menu,
      plans: plans.map(({ plan, subscribers }) => ({ ...plan, subscribers })),
      expenses,
      summary: { subscribers, expectedIncome, spent, net: expectedIncome - spent },
    };
  }

  @Put(":branchId/menu")
  async saveMenu(@CurrentUser() user: AuthUser, @Param("branchId", ParseUUIDPipe) branchId: string, @Body({ schema: MenuBody }) d: z.infer<typeof MenuBody>) {
    requireManage(user);
    await messBranch(user, branchId);
    await db.transaction(async (tx) => {
      await tx.delete(messMenus).where(eq(messMenus.branchId, branchId));
      await tx.insert(messMenus).values(d.days.map((day) => ({ ...day, orgId: user.orgId, branchId })));
    });
    return { ok: true };
  }

  @Post(":branchId/plans")
  async createPlan(@CurrentUser() user: AuthUser, @Param("branchId", ParseUUIDPipe) branchId: string, @Body({ schema: PlanBody }) d: z.infer<typeof PlanBody>) {
    requireManage(user);
    await messBranch(user, branchId);
    const [plan] = await db.insert(messPlans).values({ ...d, orgId: user.orgId, branchId }).returning();
    return plan;
  }

  @Patch("plans/:id")
  async updatePlan(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body({ schema: PlanPatch }) d: z.infer<typeof PlanPatch>) {
    requireManage(user);
    const [plan] = await db.select().from(messPlans).where(and(eq(messPlans.id, id), eq(messPlans.orgId, user.orgId)));
    if (!plan) throw new NotFoundException("Plan not found");
    assertBranchAccess(user, plan.branchId);
    const [updated] = await db.update(messPlans).set(d).where(eq(messPlans.id, id)).returning();
    return updated;
  }

  @Post(":branchId/expenses")
  async addExpense(@CurrentUser() user: AuthUser, @Param("branchId", ParseUUIDPipe) branchId: string, @Body({ schema: ExpenseBody }) d: z.infer<typeof ExpenseBody>) {
    requireManage(user);
    await messBranch(user, branchId);
    const [e] = await db.insert(messExpenses).values({ ...d, orgId: user.orgId, branchId }).returning();
    return e;
  }

  @Delete("expenses/:id")
  @HttpCode(204)
  async deleteExpense(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    requireManage(user);
    const [e] = await db.select().from(messExpenses).where(and(eq(messExpenses.id, id), eq(messExpenses.orgId, user.orgId)));
    if (!e) throw new NotFoundException("Expense not found");
    assertBranchAccess(user, e.branchId);
    await db.delete(messExpenses).where(eq(messExpenses.id, id));
  }
}
