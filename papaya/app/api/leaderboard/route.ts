import { NextResponse } from "next/server";
import { getTopUsers } from "@/lib/redis/leaderboard-cache";
import { getCurrentUser } from "@/lib/auth/get-user";
import { sql } from "@/lib/db";

export async function GET(req: Request) {
  const [topUsers, currentUser] = await Promise.all([
    getTopUsers(20),
    getCurrentUser(req).catch(() => null),
  ]);

  if (topUsers.length === 0) {
    return NextResponse.json([]);
  }

  const userIds = topUsers.map(u => u.userId);
  const rows = await sql`
    SELECT id::text, display_name, guest_token
    FROM users
    WHERE id = ANY(${userIds}::uuid[])
  ` as Array<{ id: string; display_name: string | null; guest_token: string | null }>;

  const nameMap = new Map(
    rows.map(r => [r.id, r.display_name ?? (r.guest_token ? "Guest" : "Player")])
  );

  return NextResponse.json(
    topUsers.map((u, i) => ({
      rank: i + 1,
      display_name: nameMap.get(u.userId) ?? "Player",
      score: u.score,
      is_current_user: u.userId === currentUser?.id,
    }))
  );
}
