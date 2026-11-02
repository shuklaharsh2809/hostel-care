import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { and, eq, type AnyColumn } from "drizzle-orm";
import type { Request } from "express";
import { db } from "../db/index.js";
import { organizations, users } from "../db/schema.js";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "manager" | "staff";
  branchId: string | null;
  orgId: string;
  orgName: string;
};

export type TokenPayload = { uid: string; oid: string };

const IS_PUBLIC = "isPublic";
/** Mark a route as reachable without a token (login, signup, health). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/**
 * Global guard: every route needs `Authorization: Bearer <token>` unless marked @Public().
 * The user is re-loaded from the DB on each request, so role changes and removals apply immediately.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true;
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const [scheme, token] = req.headers.authorization?.split(" ") ?? [];
    if (scheme !== "Bearer" || !token) throw new UnauthorizedException("Missing token");

    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
    const user = await loadUser(payload.uid, payload.oid);
    if (!user) throw new UnauthorizedException("User no longer exists");
    req.user = user;
    return true;
  }
}

export async function loadUser(uid: string, oid: string): Promise<AuthUser | null> {
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      branchId: users.branchId,
      orgId: users.orgId,
      orgName: organizations.name,
    })
    .from(users)
    .innerJoin(organizations, eq(organizations.id, users.orgId))
    .where(and(eq(users.id, uid), eq(users.orgId, oid)))
    .limit(1);
  return row ?? null;
}

/** Injects the signed-in user into a controller method. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest<{ user: AuthUser }>().user;
});

// ---------- Authorization helpers ----------

export function requireOwner(user: AuthUser) {
  if (user.role !== "owner") throw new ForbiddenException("Only the owner can do this");
}

export function canManage(user: AuthUser) {
  return user.role === "owner" || user.role === "manager";
}

export function requireManage(user: AuthUser) {
  if (!canManage(user)) throw new ForbiddenException("You have view-only access");
}

/** Owners see all branches; managers/staff limited to one branch see only theirs. */
export function branchScope(user: AuthUser): string | null {
  return user.role === "owner" ? null : user.branchId;
}

export function assertBranchAccess(user: AuthUser, branchId: string) {
  const scope = branchScope(user);
  if (scope && scope !== branchId) throw new ForbiddenException("You can only access your own branch");
}

/** WHERE clause scoping a table to the user's org (and branch, for branch-restricted users). */
export function scoped(user: AuthUser, orgCol: AnyColumn, branchCol?: AnyColumn) {
  const branch = branchScope(user);
  return branch && branchCol ? and(eq(orgCol, user.orgId), eq(branchCol, branch)) : eq(orgCol, user.orgId);
}
