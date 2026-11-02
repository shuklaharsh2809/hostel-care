import { Body, ConflictException, Controller, Get, HttpCode, Post, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { CurrentUser, Public, loadUser, type AuthUser, type TokenPayload } from "../../common/auth.js";
import { db } from "../../db/index.js";
import { branches, organizations, users } from "../../db/schema.js";

const SignupBody = z.object({
  hostelName: z.string().trim().min(2, "Hostel / business name is required"),
  branchName: z.string().trim().min(2, "First branch name is required"),
  city: z.string().trim().nullish(),
  name: z.string().trim().min(2, "Your name is required"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const LoginBody = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

@Controller("auth")
export class AuthController {
  constructor(private readonly jwt: JwtService) {}

  private async issue(uid: string, oid: string) {
    const payload: TokenPayload = { uid, oid };
    const user = (await loadUser(uid, oid))!;
    return { token: await this.jwt.signAsync(payload), user };
  }

  /** Creates a new hostel business (organization), its first branch and its owner. */
  @Public()
  @Post("signup")
  async signup(@Body({ schema: SignupBody }) d: z.infer<typeof SignupBody>) {
    const taken = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${d.email}`).limit(1);
    if (taken.length) throw new ConflictException("An account with this email already exists. Please log in.");

    const passwordHash = await bcrypt.hash(d.password, 10);
    const prefix = d.hostelName.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "INV";
    const { org, user } = await db.transaction(async (tx) => {
      const [org] = await tx.insert(organizations).values({ name: d.hostelName, email: d.email, invoicePrefix: prefix }).returning();
      await tx.insert(branches).values({ orgId: org!.id, name: d.branchName, code: "MAIN", city: d.city || null });
      const [user] = await tx.insert(users).values({ orgId: org!.id, name: d.name, email: d.email, passwordHash, role: "owner" }).returning();
      return { org: org!, user: user! };
    });
    return this.issue(user.id, org.id);
  }

  @Public()
  @Post("login")
  @HttpCode(200)
  async login(@Body({ schema: LoginBody }) d: z.infer<typeof LoginBody>) {
    const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${d.email}`).limit(1);
    const ok = user && (await bcrypt.compare(d.password, user.passwordHash));
    if (!ok) throw new UnauthorizedException("Incorrect email or password");
    return this.issue(user.id, user.orgId);
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
