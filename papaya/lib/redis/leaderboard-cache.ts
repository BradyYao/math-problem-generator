import { redis } from "@/lib/redis";
import { getISOWeek, getISOWeekYear, startOfISOWeek, format } from "date-fns";

const LEADERBOARD_TTL = 60 * 60 * 24 * 14; // 14 days

function currentWeekKey(): string {
  const now = new Date();
  const year = getISOWeekYear(now);
  const week = getISOWeek(now);
  return `leaderboard:${year}-W${String(week).padStart(2, "0")}`;
}

function weekKey(weekStart: Date): string {
  const year = getISOWeekYear(weekStart);
  const week = getISOWeek(weekStart);
  return `leaderboard:${year}-W${String(week).padStart(2, "0")}`;
}

export function getCurrentWeekStart(): string {
  return format(startOfISOWeek(new Date()), "yyyy-MM-dd");
}

/** Increment a user's score for the current week */
export async function incrementLeaderboardScore(
  userId: string,
  points: number
): Promise<void> {
  const key = currentWeekKey();
  await redis.zincrby(key, points, userId);
  await redis.expire(key, LEADERBOARD_TTL);
}

/** Get a user's current week rank (0-indexed, null if not on board) */
export async function getUserRank(userId: string): Promise<number | null> {
  const key = currentWeekKey();
  const rank = await redis.zrevrank(key, userId);
  return rank; // null if user not in set
}

/** Get a user's current week score */
export async function getUserScore(userId: string): Promise<number> {
  const key = currentWeekKey();
  const score = await redis.zscore(key, userId);
  return score ? Math.round(score) : 0;
}

/** Get top N users for the current week: [{userId, score}] */
export async function getTopUsers(
  n = 100
): Promise<Array<{ userId: string; score: number }>> {
  const key = currentWeekKey();
  // zrange with rev:true + withScores returns [{member, score}, ...] in Upstash v2
  const results = await redis.zrange<string[]>(key, 0, n - 1, {
    rev: true,
    withScores: true,
  });

  const out: Array<{ userId: string; score: number }> = [];
  for (let i = 0; i < results.length; i += 2) {
    out.push({
      userId: results[i],
      score: Math.round(Number(results[i + 1])),
    });
  }
  return out;
}

/** AI rate limiting: returns remaining generations (max 20/day) */
export async function checkAIRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const key = `ai_rate:${userId}`;
  const count = (await redis.get<number>(key)) ?? 0;
  const MAX = 20;

  if (count >= MAX) {
    return { allowed: false, remaining: 0 };
  }

  const newCount = await redis.incr(key);
  if (newCount === 1) {
    // First increment — set 24h TTL
    await redis.expire(key, 60 * 60 * 24);
  }

  return { allowed: true, remaining: MAX - newCount };
}
