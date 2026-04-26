import { redis } from "@/lib/redis";
import { sql } from "@/lib/db";

function allTimeKey(userId: string) {
  return `alltime:points:${userId}`;
}

/** Get all-time Papaya Points; seeds from DB on cache miss */
export async function getAllTimePoints(userId: string): Promise<number> {
  const key = allTimeKey(userId);
  const cached = await redis.get<number>(key);
  if (cached !== null) return Number(cached);

  const rows = await sql`
    SELECT COALESCE(SUM((state->>'papaya_score_accumulator')::numeric), 0)::int AS total
    FROM sessions
    WHERE user_id = ${userId} AND is_complete = true
  `;
  const total = (rows[0] as { total: number }).total ?? 0;
  await redis.set(key, total);
  return total;
}

/**
 * Increment all-time points and return the new total.
 * Seeds from DB first if the key is missing so the counter stays accurate.
 */
export async function incrementAllTimePoints(userId: string, points: number): Promise<number> {
  const key = allTimeKey(userId);
  const exists = await redis.exists(key);
  if (!exists) await getAllTimePoints(userId); // seed
  return redis.incrby(key, points);
}
