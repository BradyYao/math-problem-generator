import { neon } from "@neondatabase/serverless";
import type { NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;

export function getDb(): NeonQueryFunction<false, false> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// Convenience proxy — use this in query files
// Target must be a function so tagged template literals (sql`...`) work
export const sql: NeonQueryFunction<false, false> = new Proxy(
  function () {} as unknown as NeonQueryFunction<false, false>,
  {
    apply(_target, _thisArg, args) {
      return (getDb() as unknown as (...a: unknown[]) => unknown)(...args);
    },
    get(_target, prop) {
      const db = getDb();
      const val = (db as unknown as Record<string | symbol, unknown>)[prop];
      return typeof val === "function" ? val.bind(db) : val;
    },
  }
);
