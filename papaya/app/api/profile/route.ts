import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/db/queries/users";
import { getUserScore, getUserRank } from "@/lib/redis/leaderboard-cache";
import { getRecentSessions } from "@/lib/db/queries/sessions";
import { sql } from "@/lib/db";

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = await getUserByClerkId(clerkId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [weeklyScore, weeklyRank, recentSessions, allTimeRows] = await Promise.all([
    getUserScore(user.id),
    getUserRank(user.id),
    getRecentSessions(user.id, 10),
    sql`
      SELECT
        COUNT(*)::int AS total_sessions,
        COALESCE(SUM(problems_correct), 0)::int AS total_correct,
        COALESCE(SUM(problems_delivered), 0)::int AS total_problems
      FROM sessions
      WHERE user_id = ${user.id} AND is_complete = true
    `,
  ]);

  const allTime = allTimeRows[0] as {
    total_sessions: number;
    total_correct: number;
    total_problems: number;
  };

  const sessions = recentSessions.map((s) => ({
    id: s.id,
    mode: s.mode,
    started_at: s.started_at,
    problems_delivered: s.problems_delivered,
    problems_correct: s.problems_correct,
    score: s.state?.papaya_score_accumulator ?? 0,
  }));

  return NextResponse.json({
    display_name: user.display_name,
    weekly_score: weeklyScore,
    weekly_rank: weeklyRank != null ? weeklyRank + 1 : null, // 1-indexed
    all_time: allTime,
    recent_sessions: sessions,
  });
}
