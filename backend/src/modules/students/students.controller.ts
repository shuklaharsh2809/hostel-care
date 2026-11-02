import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { branchScope, CurrentUser, requireManage, scoped, type AuthUser } from "../../common/auth.js";
import { todayISO } from "../../common/format.js";
import { optDate, optText, paise } from "../../common/schemas.js";
import { db } from "../../db/index.js";
import { branches, invoices, messPlans, rooms, students } from "../../db/schema.js";

const StudentBody = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  gender: z.enum(["male", "female", "other"]).nullish().transform((v) => v ?? null),
  dateOfBirth: optDate,
  phone: optText,
  email: z.string().trim().toLowerCase().email("Invalid email").nullish().or(z.literal("")).transform((v) => v || null),
  bloodGroup: optText,
  institution: optText,
  course: optText,
  permanentAddress: optText,
  idProofType: optText,
  idProofNumber: optText,
  guardianName: optText,
  guardianRelation: optText,
  guardianPhone: optText,
  branchId: z.string().uuid("Choose a branch"),
  roomId: z.string().uuid().nullish().or(z.literal("")).transform((v) => v || null),
  messPlanId: z.string().uuid().nullish().or(z.literal("")).transform((v) => v || null),
  joinDate: optDate.transform((v) => v ?? todayISO()),
  monthlyRent: paise.default(0),
  securityDeposit: paise.default(0),
  notes: optText,
});
type StudentBody = z.infer<typeof StudentBody>;

const ListQuery = z.object({
  q: z.string().trim().optional(),
  branch: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["active", "left", "all"]).default("active"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const StatusBody = z.object({ status: z.enum(["active", "left"]) });

/** Branch, room and mess plan must belong to this org and to each other; room must have a free bed. */
async function validateRefs(user: AuthUser, d: StudentBody, currentStudentId?: string) {
  const scope = branchScope(user);
  if (scope && scope !== d.branchId) throw new ForbiddenException("You can only manage students in your branch");
  const [branch] = await db.select().from(branches).where(and(eq(branches.id, d.branchId), eq(branches.orgId, user.orgId)));
  if (!branch) throw new BadRequestException("Branch not found");
  if (d.roomId) {
    const [room] = await db.select().from(rooms).where(and(eq(rooms.id, d.roomId), eq(rooms.branchId, d.branchId)));
    if (!room) throw new BadRequestException("Selected room is not in this branch");
    const [occ] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(students)
      .where(
        and(
          eq(students.roomId, d.roomId),
          eq(students.status, "active"),
          currentStudentId ? sql`${students.id} <> ${currentStudentId}` : undefined,
        ),
      );
    if ((occ?.n ?? 0) >= room.capacity) throw new BadRequestException(`Room ${room.number} is already full (${room.capacity} beds)`);
  }
  if (d.messPlanId) {
    const [plan] = await db.select().from(messPlans).where(and(eq(messPlans.id, d.messPlanId), eq(messPlans.branchId, d.branchId)));
    if (!plan) throw new BadRequestException("Selected mess plan is not offered at this branch");
  }
}

@Controller("students")
export class StudentsController {
  @Get()
  async list(@CurrentUser() user: AuthUser, @Query({ schema: ListQuery }) qs: z.infer<typeof ListQuery>) {
    const where = and(
      scoped(user, students.orgId, students.branchId),
      qs.branch ? eq(students.branchId, qs.branch) : undefined,
      qs.status !== "all" ? eq(students.status, qs.status) : undefined,
      qs.q
        ? or(
            ilike(students.fullName, `%${qs.q}%`),
            ilike(students.phone, `%${qs.q}%`),
            ilike(students.email, `%${qs.q}%`),
            ilike(students.institution, `%${qs.q}%`),
            ilike(rooms.number, `%${qs.q}%`),
          )
        : undefined,
    );
    const [rows, [count]] = await Promise.all([
      db
        .select({
          id: students.id,
          fullName: students.fullName,
          phone: students.phone,
          institution: students.institution,
          course: students.course,
          status: students.status,
          joinDate: students.joinDate,
          branchName: branches.name,
          branchCode: branches.code,
          roomNumber: rooms.number,
          messPlan: messPlans.name,
          dues: sql<number>`(select coalesce(sum(i.total - i.amount_paid),0)::int from invoices i where i.student_id = "students"."id" and i.status in ('issued','partially_paid'))`,
        })
        .from(students)
        .innerJoin(branches, eq(branches.id, students.branchId))
        .leftJoin(rooms, eq(rooms.id, students.roomId))
        .leftJoin(messPlans, eq(messPlans.id, students.messPlanId))
        .where(where)
        .orderBy(desc(students.createdAt))
        .limit(qs.pageSize)
        .offset((qs.page - 1) * qs.pageSize),
      db.select({ total: sql<number>`count(*)::int` }).from(students).leftJoin(rooms, eq(rooms.id, students.roomId)).where(where),
    ]);
    return { rows, total: count?.total ?? 0, page: qs.page, pageSize: qs.pageSize };
  }

  /** Branches, rooms (with occupancy) and active mess plans for the student form. */
  @Get("form-options")
  async formOptions(@CurrentUser() user: AuthUser) {
    const [branchRows, roomRows, planRows] = await Promise.all([
      db.select({ id: branches.id, name: branches.name }).from(branches).where(scoped(user, branches.orgId, branches.id)).orderBy(branches.createdAt),
      db
        .select({
          id: rooms.id,
          branchId: rooms.branchId,
          number: rooms.number,
          capacity: rooms.capacity,
          monthlyRent: rooms.monthlyRent,
          occupied: sql<number>`(select count(*)::int from students s where s.room_id = "rooms"."id" and s.status = 'active')`,
        })
        .from(rooms)
        .where(scoped(user, rooms.orgId, rooms.branchId))
        .orderBy(rooms.number),
      db
        .select({ id: messPlans.id, branchId: messPlans.branchId, name: messPlans.name, monthlyFee: messPlans.monthlyFee })
        .from(messPlans)
        .where(and(scoped(user, messPlans.orgId, messPlans.branchId), eq(messPlans.active, true))),
    ]);
    return { branches: branchRows, rooms: roomRows, plans: planRows };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body({ schema: StudentBody }) d: StudentBody) {
    requireManage(user);
    await validateRefs(user, d);
    const [s] = await db.insert(students).values({ ...d, orgId: user.orgId }).returning();
    return s;
  }

  /** Full profile with branch, room, mess plan and invoices. */
  @Get(":id")
  async get(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const [row] = await db
      .select({ student: students, branch: branches, room: rooms, plan: messPlans })
      .from(students)
      .innerJoin(branches, eq(branches.id, students.branchId))
      .leftJoin(rooms, eq(rooms.id, students.roomId))
      .leftJoin(messPlans, eq(messPlans.id, students.messPlanId))
      .where(and(eq(students.id, id), scoped(user, students.orgId, students.branchId)));
    if (!row) throw new NotFoundException("Student not found");
    const invoiceRows = await db.select().from(invoices).where(eq(invoices.studentId, id)).orderBy(desc(invoices.issueDate), desc(invoices.createdAt));
    return { ...row, invoices: invoiceRows };
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body({ schema: StudentBody }) d: StudentBody) {
    requireManage(user);
    const [existing] = await db.select({ id: students.id }).from(students).where(and(eq(students.id, id), scoped(user, students.orgId, students.branchId)));
    if (!existing) throw new NotFoundException("Student not found");
    await validateRefs(user, d, id);
    const [s] = await db.update(students).set(d).where(and(eq(students.id, id), eq(students.orgId, user.orgId))).returning();
    return s;
  }

  /** Mark as left (frees the bed) or re-admit. */
  @Post(":id/status")
  async setStatus(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body({ schema: StatusBody }) { status }: z.infer<typeof StatusBody>) {
    requireManage(user);
    const [s] = await db
      .update(students)
      .set(status === "left" ? { status, leaveDate: todayISO(), roomId: null } : { status, leaveDate: null })
      .where(and(eq(students.id, id), scoped(user, students.orgId, students.branchId)))
      .returning();
    if (!s) throw new NotFoundException("Student not found");
    return s;
  }
}
