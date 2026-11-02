import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

/**
 * DATABASE_URL set   -> real PostgreSQL (production, staging, docker).
 * DATABASE_URL empty -> embedded PGlite (Postgres compiled to WASM) in ./.data,
 *                       so the app runs locally with zero setup.
 * Both speak the same Postgres dialect, so the schema and queries are identical.
 */
function createDb() {
  const url = process.env.DATABASE_URL;
  if (url) {
    return drizzlePostgres(postgres(url, { max: 10 }), { schema });
  }
  const dir = process.env.PGLITE_DIR ?? "./.data/pglite";
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  // The two drivers share an API surface; we type everything as postgres-js.
  return drizzlePglite(client, { schema }) as unknown as ReturnType<typeof drizzlePostgres<typeof schema>>;
}

export type DB = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as { __hostelCareDb?: DB };

function getDb(): DB {
  globalForDb.__hostelCareDb ??= createDb();
  return globalForDb.__hostelCareDb;
}

/** Lazily connected: importing this module never opens a connection (keeps builds clean). */
export const db: DB = new Proxy({} as DB, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
