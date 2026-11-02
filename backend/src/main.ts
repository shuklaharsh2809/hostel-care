import "reflect-metadata";
import { BadRequestException, Logger, StandardSchemaValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    credentials: true,
  });
  // Validates every @Body/@Query/@Param that declares a Zod `schema`; replies 400 with the first message.
  app.useGlobalPipes(
    new StandardSchemaValidationPipe({
      exceptionFactory: (issues) => new BadRequestException(issues[0]?.message ?? "Invalid request"),
    }),
  );
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  Logger.log(`HostelCare API listening on http://localhost:${port}/api`, "Bootstrap");
}

void bootstrap();
