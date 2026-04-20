/**
 * Seed the topics table from content/topics/taxonomy.json
 * Run: npx tsx scripts/seed-topics.ts
 *
 * Topics with parent_id must be inserted after their parent,
 * so we insert in sort_order ascending (parents always have lower sort_order).
 */
import { config } from "dotenv";
import { join } from "path";
config({ path: join(process.cwd(), ".env.local") });

import { neon } from "@neondatabase/serverless";
import taxonomy from "../content/topics/taxonomy.json";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(databaseUrl);

  // Sort by sort_order so parents are inserted before children
  const sorted = [...taxonomy].sort((a, b) => a.sort_order - b.sort_order);

  console.log(`Seeding ${sorted.length} topics...`);

  let inserted = 0;
  let skipped = 0;

  for (const topic of sorted) {
    try {
      await sql`
        INSERT INTO topics (id, name, parent_id, grade_band, domain, sat_relevant, act_relevant, amc_relevant, sort_order)
        VALUES (
          ${topic.id},
          ${topic.name},
          ${topic.parent_id},
          ${topic.grade_band},
          ${topic.domain},
          ${topic.sat_relevant},
          ${topic.act_relevant},
          ${topic.amc_relevant},
          ${topic.sort_order}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          parent_id = EXCLUDED.parent_id,
          grade_band = EXCLUDED.grade_band,
          domain = EXCLUDED.domain,
          sat_relevant = EXCLUDED.sat_relevant,
          act_relevant = EXCLUDED.act_relevant,
          amc_relevant = EXCLUDED.amc_relevant,
          sort_order = EXCLUDED.sort_order
      `;
      inserted++;
    } catch (err) {
      console.error(`Failed to insert topic ${topic.id}:`, err);
      skipped++;
    }
  }

  console.log(`Done. Inserted/updated: ${inserted}, skipped: ${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
