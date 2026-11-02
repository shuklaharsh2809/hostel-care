import { Controller, Get, Query } from "@nestjs/common";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { CurrentUser, scoped, type AuthUser } from "../../common/auth.js";
import { db } from "../../db/index.js";
import { branches, invoices, rooms, students } from "../../db/schema.js";

const SearchQuery = z.object({ q: z.string().trim().max(100).default("") });

/** Global search for the Cmd+K palette: students, invoices and branches the user can see. */
@Controller("search")
export class SearchController {
  @Get()
  async search(@CurrentUser() user: AuthUser, @Query({ schema: SearchQuery }) { q }: z.infer<typeof SearchQuery>) {
    if (q.length < 2) return { students: [], invoices: [], branches: [] };
    const like = `%${q}%`;
    const [studentRows, invoiceRows, branchRows] = await Promise.all([
      db
        .select({
          id: students.id,
          fullName: students.fullName,
          phone: students.phone,
          status: students.status,
          photoUrl: students.photoUrl,
          roomNumber: rooms.number,
          branchCode: branches.code,
        })
        .from(students)
        .innerJoin(branches, eq(branches.id, students.branchId))
        .leftJoin(rooms, eq(rooms.id, students.roomId))
        .where(
          and(
            scoped(user, students.orgId, students.branchId),
            or(ilike(students.fullName, like), ilike(students.phone, like), ilike(students.email, like), ilike(rooms.number, like)),
          ),
        )
        .orderBy(students.status, students.fullName)
        .limit(6),
      db
        .select({ id: invoices.id, number: invoices.number, total: invoices.total, status: invoices.status, studentName: students.fullName })
        .from(invoices)
        .innerJoin(students, eq(students.id, invoices.studentId))
        .where(and(scoped(user, invoices.orgId, invoices.branchId), or(ilike(invoices.number, like), ilike(invoices.periodLabel, like))))
        .orderBy(desc(invoices.issueDate))
        .limit(5),
      db
        .select({ id: branches.id, name: branches.name, code: branches.code, city: branches.city })
        .from(branches)
        .where(and(scoped(user, branches.orgId, branches.id), or(ilike(branches.name, like), ilike(branches.code, like), ilike(branches.city, like))))
        .limit(3),
    ]);
    return { students: studentRows, invoices: invoiceRows, branches: branchRows };
  }
}
