import { BadRequestException, Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { and, asc, desc, eq, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { assertBranchAccess, CurrentUser, requireManage, requireOwner, scoped, type AuthUser } from "../../common/auth.js";
import { addDaysISO, monthLabel, todayISO } from "../../common/format.js";
import { isoDate, optDate, optText, paise } from "../../common/schemas.js";
import { db } from "../../db/index.js";
import { branches, invoiceItems, invoices, messPlans, organizations, payments, rooms, students } from "../../db/schema.js";
import { createInvoice, refreshInvoicePaymentStatus } from "../../lib/billing.js";

const ListQuery = z.object({
  status: z.enum(["all", "unpaid", "overdue", "paid", "void"]).default("all"),
  branch: z.string().uuid().optional().or(z.literal("")),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

const InvoiceBody = z.object({
  studentId: z.string().uuid("Choose a student"),
  items: z
    .array(z.object({ description: z.string().trim().min(1), quantity: z.number().int().min(1), unitPrice: paise }))
    .min(1, "Add at least one line item"),
  discount: paise.default(0),
  taxPercent: z.number().min(0).max(28).default(0),
  issueDate: optDate.transform((v) => v ?? todayISO()),
  dueDate: optDate,
  periodLabel: optText,
  notes: optText,
});

const PaymentBody = z.object({
  amount: paise.refine((v) => v > 0, "Amount must be more than zero"),
  method: z.enum(["cash", "upi", "bank_transfer", "card", "cheque"]),
  reference: optText,
  paidOn: optDate.transform((v) => v ?? todayISO()),
});

const BulkBody = z
  .object({
    branchId: z.string().uuid("Choose a branch"),
    periodLabel: z.string().trim().min(2, "Billing period is required"),
    issueDate: isoDate,
    dueDate: optDate,
    includeRent: z.boolean().default(true),
    includeMess: z.boolean().default(true),
  })
  .refine((d) => d.includeRent || d.includeMess, "Select at least rent or mess");

const unpaid = inArray(invoices.status, ["issued", "partially_paid"]);

@Controller()
export class InvoicesController {
  @Get("invoices")
  async list(@CurrentUser() user: AuthUser, @Query({ schema: ListQuery }) qs: z.infer<typeof ListQuery>) {
    const today = todayISO();
    const statusCond =
      qs.status === "unpaid"
        ? unpaid
        : qs.status === "overdue"
          ? and(unpaid, lt(invoices.dueDate, today))
          : qs.status === "paid"
            ? eq(invoices.status, "paid")
            : qs.status === "void"
              ? eq(invoices.status, "void")
              : undefined;
    const base = and(scoped(user, invoices.orgId, invoices.branchId), qs.branch ? eq(invoices.branchId, qs.branch) : undefined);
    const where = and(
      base,
      statusCond,
      qs.q ? or(ilike(invoices.number, `%${qs.q}%`), ilike(students.fullName, `%${qs.q}%`), ilike(invoices.periodLabel, `%${qs.q}%`)) : undefined,
    );

    const [rows, [count], [summary]] = await Promise.all([
      db
        .select({ invoice: invoices, studentName: students.fullName, branchCode: branches.code })
        .from(invoices)
        .innerJoin(students, eq(students.id, invoices.studentId))
        .innerJoin(branches, eq(branches.id, invoices.branchId))
        .where(where)
        .orderBy(desc(invoices.issueDate), desc(invoices.number))
        .limit(qs.pageSize)
        .offset((qs.page - 1) * qs.pageSize),
      db.select({ n: sql<number>`count(*)::int` }).from(invoices).innerJoin(students, eq(students.id, invoices.studentId)).where(where),
      db
        .select({
          billed: sql<number>`coalesce(sum(${invoices.total}) filter (where ${invoices.status} <> 'void'),0)::int`,
          collected: sql<number>`coalesce(sum(${invoices.amountPaid}),0)::int`,
          outstanding: sql<number>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}) filter (where ${invoices.status} in ('issued','partially_paid')),0)::int`,
          overdue: sql<number>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}) filter (where ${invoices.status} in ('issued','partially_paid') and ${invoices.dueDate} < ${today}),0)::int`,
        })
        .from(invoices)
        .where(base),
    ]);
    return {
      rows: rows.map(({ invoice, ...rest }) => ({ ...invoice, ...rest })),
      total: count?.n ?? 0,
      page: qs.page,
      pageSize: qs.pageSize,
      summary,
    };
  }

  /** Students (with rent and mess plan) and defaults for the invoice editor. */
  @Get("invoices/new-options")
  async newOptions(@CurrentUser() user: AuthUser) {
    const [list, [org]] = await Promise.all([
      db
        .select({
          id: students.id,
          fullName: students.fullName,
          branchName: branches.name,
          roomNumber: rooms.number,
          monthlyRent: students.monthlyRent,
          planName: messPlans.name,
          planFee: messPlans.monthlyFee,
        })
        .from(students)
        .innerJoin(branches, eq(branches.id, students.branchId))
        .leftJoin(rooms, eq(rooms.id, students.roomId))
        .leftJoin(messPlans, eq(messPlans.id, students.messPlanId))
        .where(and(scoped(user, students.orgId, students.branchId), eq(students.status, "active")))
        .orderBy(students.fullName),
      db.select({ defaultTaxPercent: organizations.defaultTaxPercent }).from(organizations).where(eq(organizations.id, user.orgId)),
    ]);
    const today = todayISO();
    return {
      students: list,
      defaultTaxPercent: org?.defaultTaxPercent ?? 0,
      defaults: { issueDate: today, dueDate: addDaysISO(today, 10), periodLabel: monthLabel(today) },
    };
  }

  /** Branches with active-student counts, for the monthly billing run screen. */
  @Get("invoices/bulk-options")
  async bulkOptions(@CurrentUser() user: AuthUser) {
    const list = await db
      .select({
        id: branches.id,
        name: branches.name,
        activeStudents: sql<number>`(select count(*)::int from students s where s.branch_id = "branches"."id" and s.status = 'active')`,
      })
      .from(branches)
      .where(scoped(user, branches.orgId, branches.id))
      .orderBy(branches.createdAt);
    const today = todayISO();
    const first = today.slice(0, 8) + "01";
    return { branches: list, defaults: { periodLabel: monthLabel(today), issueDate: first, dueDate: addDaysISO(first, 9) } };
  }

  @Post("invoices")
  async create(@CurrentUser() user: AuthUser, @Body({ schema: InvoiceBody }) d: z.infer<typeof InvoiceBody>) {
    requireManage(user);
    const [student] = await db.select().from(students).where(and(eq(students.id, d.studentId), eq(students.orgId, user.orgId)));
    if (!student) throw new NotFoundException("Student not found");
    assertBranchAccess(user, student.branchId);
    return db.transaction((tx) => createInvoice(tx, { ...d, orgId: user.orgId, branchId: student.branchId, studentId: student.id }));
  }

  /** Invoice with line items, payments, student, branch and the org's billing details. */
  @Get("invoices/:id")
  async get(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const [row] = await db
      .select({ invoice: invoices, student: students, branch: branches, organization: organizations, roomNumber: rooms.number })
      .from(invoices)
      .innerJoin(students, eq(students.id, invoices.studentId))
      .innerJoin(branches, eq(branches.id, invoices.branchId))
      .innerJoin(organizations, eq(organizations.id, invoices.orgId))
      .leftJoin(rooms, eq(rooms.id, students.roomId))
      .where(and(eq(invoices.id, id), scoped(user, invoices.orgId, invoices.branchId)));
    if (!row) throw new NotFoundException("Invoice not found");
    const [items, pays] = await Promise.all([
      db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id)).orderBy(asc(invoiceItems.position)),
      db.select().from(payments).where(eq(payments.invoiceId, id)).orderBy(desc(payments.paidOn), desc(payments.createdAt)),
    ]);
    const { nextInvoiceNumber: _n, ...organization } = row.organization;
    return { ...row, organization, items, payments: pays };
  }

  @Post("invoices/:id/payments")
  async recordPayment(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body({ schema: PaymentBody }) d: z.infer<typeof PaymentBody>) {
    requireManage(user);
    const [inv] = await db.select().from(invoices).where(and(eq(invoices.id, id), scoped(user, invoices.orgId, invoices.branchId)));
    if (!inv) throw new NotFoundException("Invoice not found");
    if (inv.status === "void") throw new BadRequestException("This invoice is void");
    const balance = inv.total - inv.amountPaid;
    if (d.amount > balance) throw new BadRequestException(`Amount is more than the balance due (₹${(balance / 100).toLocaleString("en-IN")})`);
    return db.transaction(async (tx) => {
      const [payment] = await tx.insert(payments).values({ ...d, orgId: user.orgId, invoiceId: id }).returning();
      await refreshInvoicePaymentStatus(tx, user.orgId, id);
      return payment;
    });
  }

  @Delete("payments/:id")
  @HttpCode(204)
  async deletePayment(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    requireOwner(user);
    const [p] = await db.select().from(payments).where(and(eq(payments.id, id), eq(payments.orgId, user.orgId)));
    if (!p) throw new NotFoundException("Payment not found");
    await db.transaction(async (tx) => {
      await tx.delete(payments).where(eq(payments.id, id));
      await refreshInvoicePaymentStatus(tx, user.orgId, p.invoiceId);
    });
  }

  @Post("invoices/:id/void")
  async void(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    requireOwner(user);
    const [inv] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.orgId, user.orgId)));
    if (!inv) throw new NotFoundException("Invoice not found");
    if (inv.amountPaid > 0) throw new BadRequestException("Invoices with payments can't be voided. Delete the payments first.");
    const [updated] = await db.update(invoices).set({ status: "void" }).where(eq(invoices.id, id)).returning();
    return updated;
  }

  /** One invoice per active student in a branch (rent + mess). Students already billed for the period are skipped. */
  @Post("invoices/bulk")
  async bulk(@CurrentUser() user: AuthUser, @Body({ schema: BulkBody }) d: z.infer<typeof BulkBody>) {
    requireManage(user);
    assertBranchAccess(user, d.branchId);
    const [branch] = await db.select().from(branches).where(and(eq(branches.id, d.branchId), eq(branches.orgId, user.orgId)));
    if (!branch) throw new NotFoundException("Branch not found");
    const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId));

    const rows = await db
      .select({ s: students, roomNumber: rooms.number, plan: messPlans })
      .from(students)
      .leftJoin(rooms, eq(rooms.id, students.roomId))
      .leftJoin(messPlans, eq(messPlans.id, students.messPlanId))
      .where(and(eq(students.branchId, d.branchId), eq(students.status, "active")));

    const already = new Set(
      rows.length
        ? (
            await db
              .select({ studentId: invoices.studentId })
              .from(invoices)
              .where(
                and(
                  eq(invoices.orgId, user.orgId),
                  eq(invoices.periodLabel, d.periodLabel),
                  inArray(
                    invoices.studentId,
                    rows.map((r) => r.s.id),
                  ),
                ),
              )
          ).map((r) => r.studentId)
        : [],
    );

    let created = 0;
    let skipped = 0;
    await db.transaction(async (tx) => {
      for (const { s, roomNumber, plan } of rows) {
        const items = [];
        if (d.includeRent && s.monthlyRent > 0)
          items.push({ description: `Room rent – ${d.periodLabel}${roomNumber ? ` (Room ${roomNumber})` : ""}`, quantity: 1, unitPrice: s.monthlyRent });
        if (d.includeMess && plan) items.push({ description: `Mess – ${plan.name} – ${d.periodLabel}`, quantity: 1, unitPrice: plan.monthlyFee });
        if (already.has(s.id) || items.length === 0) {
          skipped++;
          continue;
        }
        await createInvoice(tx, {
          orgId: user.orgId,
          branchId: d.branchId,
          studentId: s.id,
          items,
          taxPercent: org?.defaultTaxPercent ?? 0,
          issueDate: d.issueDate,
          dueDate: d.dueDate,
          periodLabel: d.periodLabel,
        });
        created++;
      }
    });
    return { created, skipped, branchName: branch.name };
  }
}
