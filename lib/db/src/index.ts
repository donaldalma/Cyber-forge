import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? process.env.SUPABASE_CONNECTION_STRING;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or SUPABASE_DB_URL must be set. Use your Supabase project's Postgres connection string.",
  );
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });

export * from "./schema";
