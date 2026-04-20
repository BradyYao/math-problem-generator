import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const gradeBand = searchParams.get("grade_band");

  const rows = gradeBand
    ? await sql`
        SELECT id, name, domain, parent_id
        FROM topics
        WHERE grade_band = ${gradeBand}
          AND parent_id IS NOT NULL
        ORDER BY sort_order ASC
      `
    : await sql`
        SELECT id, name, domain, parent_id
        FROM topics
        WHERE parent_id IS NOT NULL
        ORDER BY sort_order ASC
      `;

  return NextResponse.json(rows);
}
