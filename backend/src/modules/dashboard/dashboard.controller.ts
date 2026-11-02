import { Controller, Get } from "@nestjs/common";
import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { CurrentUser, scoped, type AuthUser } from "../../common/auth.js";
import { todayISO } from "../../common/format.js";
import { db } from "../../db/index.js";
import { branches, invoices, messExpenses, payments, rooms, students } from "../../db/schema.js";

@Controller("dashboard")
export class DashboardController {
  @Get()
  async get(@CurrentUser() user: AuthUser) {
    const today = todayISO();
    const monthStart = today.slice(0, 8) + "01";
    const unpaid = inArray(invoices.status, ["issued", "partially_paid"]);

    const [branchRows, roomAgg, studentAgg, dueAgg, [overdue], [collected], [messSpend], recentInvoices] = await Promise.all([
      db.select().from(branches).where(scoped(user, branches.orgId, branches.id)).orderBy(branches.createdAt),
      db
        .select({ branchId: rooms.branchId, beds: sql<number>`coalesce(sum(${rooms.capacity}),0)::int` })
        .from(rooms)
        .where(scoped(user, rooms.orgId, rooms.branchId))
        .groupBy(rooms.branchId),
      db
        .select({ branchId: students.branchId, count: sql<number>`count(*)::int` })
        .from(students)
        .where(and(scoped(user, students.orgId, students.branchId), eq(students.status, "active")))
        .groupBy(students.branchId),
      db
        .select({ branchId: invoices.branchId, due: sql<number>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}),0)::int` })
        .from(invoices)
        .where(and(scoped(user, invoices.orgId, invoices.branchId), unpaid))
        .groupBy(invoices.branchId),
      db
        .select({ count: sql<number>`count(*)::int`, due: sql<number>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}),0)::int` })
        .from(invoices)
        .where(and(scoped(user, invoices.orgId, invoices.branchId), unpaid, lt(invoices.dueDate, today))),
      db
        .select({ total: sql<number>`coalesce(sum(${payments.amount}),0)::int` })
        .from(payments)
        .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
        .where(and(scoped(user, invoices.orgId, invoices.branchId), gte(payments.paidOn, monthStart))),
      db
        .select({ total: sql<number>`coalesce(sum(${messExpenses.amount}),0)::int` })
        .from(messExpenses)
        .where(and(scoped(user, messExpenses.orgId, messExpenses.branchId), gte(messExpenses.spentOn, monthStart))),
      db
        .select({
          id: invoices.id,
          number: invoices.number,
          total: invoices.total,
          status: invoices.status,
          issueDate: invoices.issueDate,
          studentName: students.fullName,
        })
        .from(invoices)
        .innerJoin(students, eq(students.id, invoices.studentId))
        .where(scoped(user, invoices.orgId, invoices.branchId))
        .orderBy(desc(invoices.createdAt))
        .limit(6),
    ]);

    const beds = new Map(roomAgg.map((r) => [r.branchId, r.beds]));
    const counts = new Map(studentAgg.map((r) => [r.branchId, r.count]));
    const dues = new Map(dueAgg.map((r) => [r.branchId, r.due]));
    const totalBeds = roomAgg.reduce((s, r) => s + r.beds, 0);
    const totalStudents = studentAgg.reduce((s, r) => s + r.count, 0);

    return {
      totals: {
        branches: branchRows.length,
        students: totalStudents,
        beds: totalBeds,
        occupancyPct: totalBeds ? Math.round((totalStudents / totalBeds) * 100) : 0,
        collectedThisMonth: collected?.total ?? 0,
        messSpendThisMonth: messSpend?.total ?? 0,
        outstanding: dueAgg.reduce((s, r) => s + r.due, 0),
        overdueCount: overdue?.count ?? 0,
        overdueAmount: overdue?.due ?? 0,
      },
      branches: branchRows.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        city: b.city,
        students: counts.get(b.id) ?? 0,
        beds: beds.get(b.id) ?? 0,
        dues: dues.get(b.id) ?? 0,
      })),
      recentInvoices,
    };
  }
}
