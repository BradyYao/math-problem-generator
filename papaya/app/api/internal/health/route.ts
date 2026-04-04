import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { redis } from "@/lib/redis";

export const runtime = "edge";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};
  const errors: Record<string, string> = {};

  // Check Postgres
  try {
    await sql`SELECT 1`;
    checks.postgres = "ok";
  } catch (e) {
    checks.postgres = "error";
    errors.postgres = String(e);
  }

  // Check Redis
  try {
    await redis.ping();
    checks.redis = "ok";
  } catch (e) {
    checks.redis = "error";
    errors.redis = String(e);
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      checks,
      ...(Object.keys(errors).length > 0 && { errors }),
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  );
}
