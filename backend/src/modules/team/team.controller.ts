import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { CurrentUser, requireOwner, type AuthUser } from "../../common/auth.js";
import { optText } from "../../common/schemas.js";
import { db } from "../../db/index.js";
import { branches, organizations, users } from "../../db/schema.js";

const MemberBody = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Temporary password must be at least 8 characters"),
  role: z.enum(["manager", "staff"]),
  branchId: z.string().uuid().nullish().or(z.literal("")).transform((v) => v || null),
});

const OrgBody = z.object({
  name: z.string().trim().min(2, "Business name is required"),
  email: optText,
  phone: optText,
  address: optText,
  gstin: optText.transform((v) => v?.toUpperCase() ?? null),
  invoicePrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,8}$/, "Invoice prefix: 1–8 letters or digits"),
  defaultTaxPercent: z.number().int().min(0).max(28),
});

@Controller()
export class TeamController {
  @Get("team")
  async list(@CurrentUser() user: AuthUser) {
    requireOwner(user);
    const [members, branchList] = await Promise.all([
      db
        .select({ id: users.id, name: users.name, email: users.email, role: users.role, branchId: users.branchId, branchName: branches.name })
        .from(users)
        .leftJoin(branches, eq(branches.id, users.branchId))
        .where(eq(users.orgId, user.orgId))
        .orderBy(users.createdAt),
      db.select({ id: branches.id, name: branches.name }).from(branches).where(eq(branches.orgId, user.orgId)),
    ]);
    return { members, branches: branchList };
  }

  @Post("team")
  async add(@CurrentUser() user: AuthUser, @Body({ schema: MemberBody }) d: z.infer<typeof MemberBody>) {
    requireOwner(user);
    if (d.branchId) {
      const [b] = await db.select({ id: branches.id }).from(branches).where(and(eq(branches.id, d.branchId), eq(branches.orgId, user.orgId)));
      if (!b) throw new BadRequestException("Branch not found");
    }
    const taken = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${d.email}`);
    if (taken.length) throw new ConflictException("That email is already registered");
    const [member] = await db
      .insert(users)
      .values({ orgId: user.orgId, name: d.name, email: d.email, role: d.role, branchId: d.branchId, passwordHash: await bcrypt.hash(d.password, 10) })
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role, branchId: users.branchId });
    return member;
  }

  @Delete("team/:id")
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    requireOwner(user);
    const deleted = await db
      .delete(users)
      .where(and(eq(users.id, id), eq(users.orgId, user.orgId), ne(users.id, user.id), ne(users.role, "owner")))
      .returning({ id: users.id });
    if (!deleted.length) throw new NotFoundException("Member not found");
  }

  @Get("organization")
  async getOrg(@CurrentUser() user: AuthUser) {
    requireOwner(user);
    const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId));
    return org;
  }

  @Patch("organization")
  async updateOrg(@CurrentUser() user: AuthUser, @Body({ schema: OrgBody }) d: z.infer<typeof OrgBody>) {
    requireOwner(user);
    const [org] = await db.update(organizations).set(d).where(eq(organizations.id, user.orgId)).returning();
    return org;
  }
}
