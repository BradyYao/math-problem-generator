import { config } from "dotenv";
import { join } from "path";
config({ path: join(process.cwd(), ".env.local") });

import { readdirSync, readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

async function runMigration(sql: ReturnType<typeof neon>, filePath: string) {
  const content = readFileSync(filePath, "utf-8");

  const stripped = content
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements = stripped
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await sql.query(statement);
    process.stdout.write(".");
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(databaseUrl);
  const migrationsDir = join(process.cwd(), "lib/db/migrations");

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const filePath = join(migrationsDir, file);
    console.log(`\nRunning ${file}...`);
    await runMigration(sql, filePath);
    console.log(` done.`);
  }

  console.log("\nAll migrations complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
