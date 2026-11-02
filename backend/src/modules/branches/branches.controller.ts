import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { assertBranchAccess, CurrentUser, requireManage, requireOwner, scoped, type AuthUser } from "../../common/auth.js";
import { isUniqueViolation } from "../../common/format.js";
import { optText, paise } from "../../common/schemas.js";
import { db } from "../../db/index.js";
import { branches, rooms, students } from "../../db/schema.js";

const BranchBody = z.object({
  name: z.string().trim().min(2, "Branch name is required"),
  code: z
    .string()
    .trim()
    .min(1, "Short code is required")
    .max(8)
    .transform((v) => v.toUpperCase()),
  city: optText,
  address: optText,
  phone: optText,
  wardenName: optText,
  hasMess: z.boolean().default(true),
});
type BranchBody = z.infer<typeof BranchBody>;

const RoomBody = z.object({
  number: z.string().trim().min(1, "Room number is required"),
  floor: optText,
  roomType: z.string().trim().min(1).default("double"),
  capacity: z.number().int().min(1, "Capacity must be at least 1").max(20),
  monthlyRent: paise,
});
type RoomBody = z.infer<typeof RoomBody>;

async function findBranch(user: AuthUser, id: string) {
  assertBranchAccess(user, id);
  const [branch] = await db.select().from(branches).where(and(eq(branches.id, id), eq(branches.orgId, user.orgId)));
  if (!branch) throw new NotFoundException("Branch not found");
  return branch;
}

@Controller()
export class BranchesController {
  /** All branches the user can see, with room / bed / student counts. */
  @Get("branches")
  list(@CurrentUser() user: AuthUser) {
    return db
      .select({
        branch: branches,
        rooms: sql<number>`(select count(*)::int from rooms r where r.branch_id = "branches"."id")`,
        beds: sql<number>`(select coalesce(sum(r.capacity),0)::int from rooms r where r.branch_id = "branches"."id")`,
        students: sql<number>`(select count(*)::int from students s where s.branch_id = "branches"."id" and s.status = 'active')`,
      })
      .from(branches)
      .where(scoped(user, branches.orgId, branches.id))
      .orderBy(branches.createdAt)
      .then((rows) => rows.map(({ branch, ...counts }) => ({ ...branch, ...counts })));
  }

  @Post("branches")
  async create(@CurrentUser() user: AuthUser, @Body({ schema: BranchBody }) d: BranchBody) {
    requireOwner(user);
    try {
      const [b] = await db.insert(branches).values({ ...d, orgId: user.orgId }).returning();
      return b;
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException("Another branch already uses this short code");
      throw e;
    }
  }

  /** Branch with its rooms and the active students in each room. */
  @Get("branches/:id")
  async get(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const branch = await findBranch(user, id);
    const [roomRows, occupants] = await Promise.all([
      db.select().from(rooms).where(eq(rooms.branchId, id)).orderBy(asc(rooms.floor), asc(rooms.number)),
      db
        .select({ id: students.id, name: students.fullName, roomId: students.roomId, photoUrl: students.photoUrl })
        .from(students)
        .where(and(eq(students.branchId, id), eq(students.status, "active"))),
    ]);
    return {
      branch,
      rooms: roomRows.map((r) => ({
        ...r,
        occupants: occupants.filter((s) => s.roomId === r.id).map(({ id, name, photoUrl }) => ({ id, name, photoUrl })),
      })),
      activeStudents: occupants.length,
      studentsWithoutRoom: occupants.filter((s) => !s.roomId).length,
      unassignedStudents: occupants.filter((s) => !s.roomId).map(({ id, name, photoUrl }) => ({ id, name, photoUrl })),
    };
  }

  @Patch("branches/:id")
  async update(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body({ schema: BranchBody }) d: BranchBody) {
    requireOwner(user);
    await findBranch(user, id);
    try {
      const [b] = await db.update(branches).set(d).where(and(eq(branches.id, id), eq(branches.orgId, user.orgId))).returning();
      return b;
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException("Another branch already uses this short code");
      throw e;
    }
  }

  @Post("branches/:id/rooms")
  async createRoom(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) branchId: string, @Body({ schema: RoomBody }) d: RoomBody) {
    requireManage(user);
    await findBranch(user, branchId);
    try {
      const [room] = await db.insert(rooms).values({ ...d, orgId: user.orgId, branchId }).returning();
      return room;
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException(`Room ${d.number} already exists in this branch`);
      throw e;
    }
  }

  @Delete("rooms/:id")
  @HttpCode(204)
  async deleteRoom(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    requireManage(user);
    const [room] = await db.select().from(rooms).where(and(eq(rooms.id, id), eq(rooms.orgId, user.orgId)));
    if (!room) throw new NotFoundException("Room not found");
    assertBranchAccess(user, room.branchId);
    const [occ] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(students)
      .where(and(eq(students.roomId, id), eq(students.status, "active")));
    if ((occ?.n ?? 0) > 0) throw new BadRequestException("That room still has active students. Move them to another room first.");
    await db.delete(rooms).where(eq(rooms.id, id));
  }
}
