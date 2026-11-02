import { Controller, Get, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AuthGuard, Public } from "./common/auth.js";
import { AuthController } from "./modules/auth/auth.controller.js";
import { BranchesController } from "./modules/branches/branches.controller.js";
import { DashboardController } from "./modules/dashboard/dashboard.controller.js";
import { InvoicesController } from "./modules/invoices/invoices.controller.js";
import { MessController } from "./modules/mess/mess.controller.js";
import { StudentsController } from "./modules/students/students.controller.js";
import { TeamController } from "./modules/team/team.controller.js";

@Controller("health")
class HealthController {
  @Public()
  @Get()
  health() {
    return { ok: true };
  }
}

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must be set to a random string of at least 32 characters");
  return secret;
}

@Module({
  imports: [JwtModule.register({ global: true, secret: jwtSecret(), signOptions: { expiresIn: "7d" } })],
  controllers: [
    HealthController,
    AuthController,
    DashboardController,
    BranchesController,
    StudentsController,
    MessController,
    InvoicesController,
    TeamController,
  ],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
