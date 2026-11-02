try {
  process.loadEnvFile(".env");
} catch {
  // no .env file: rely on the real environment
}

async function main() {
  const { db } = await import("../src/db/index.js");
  if (process.env.DATABASE_URL) {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(db, { migrationsFolder: "./drizzle" });
  } else {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(".data", { recursive: true });
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder: "./drizzle" });
  }
  console.log("✓ Database migrated");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
