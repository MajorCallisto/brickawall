import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Drizzle client over the Neon serverless HTTP driver. Created lazily so that
 * builds and pages that never touch the database do not need DATABASE_URL.
 */
let cached: ReturnType<typeof createDb> | undefined;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. See .env.example.");
  }
  return drizzle({ client: neon(url), schema });
}

export function getDb() {
  cached ??= createDb();
  return cached;
}

export { schema };
