import { config } from "dotenv";
import { join } from "path";
config({ path: join(process.cwd(), ".env.local") });

import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(databaseUrl);

  const migration = readFileSync(
    join(process.cwd(), "lib/db/migrations/001_initial_schema.sql"),
    "utf-8"
  );

  // Strip comment lines, split on semicolons, filter empty statements
  const stripped = migration
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements = stripped
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Running ${statements.length} statements...`);

  for (const statement of statements) {
    await sql.query(statement);
    process.stdout.write(".");
  }

  console.log("\nMigration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
