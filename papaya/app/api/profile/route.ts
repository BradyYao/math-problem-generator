import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/db/queries/users";
import { getUserScore, getUserRank } from "@/lib/redis/leaderboard-cache";
import { getAllTimePoints } from "@/lib/redis/points-cache";
import { getRecentSessions } from "@/lib/db/queries/sessions";
import { MILESTONES } from "@/lib/achievements/milestones";
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

  const [weeklyScore, weeklyRank, allTimePoints, recentSessions, allTimeRows, earnedRows] = await Promise.all([
    getUserScore(user.id),
    getUserRank(user.id),
    getAllTimePoints(user.id),
    getRecentSessions(user.id, 10),
    sql`
      SELECT
        (SELECT COUNT(*)::int FROM sessions WHERE user_id = ${user.id} AND is_complete = true) AS total_sessions,
        COALESCE(SUM(ss.attempts), 0)::int AS total_problems,
        COALESCE(SUM(ss.correct), 0)::int AS total_correct
      FROM skill_states ss
      WHERE ss.user_id = ${user.id}
    `,
    sql`SELECT achievement_id FROM user_achievements WHERE user_id = ${user.id}`,
  ]);

  const allTime = allTimeRows[0] as {
    total_sessions: number;
    total_correct: number;
    total_problems: number;
  };

  const earnedIds = new Set((earnedRows as Array<{ achievement_id: string }>).map(r => r.achievement_id));

  const sessions = recentSessions.map((s) => ({
    id: s.id,
    mode: s.mode,
    started_at: s.started_at,
    problems_delivered: s.problems_delivered,
    problems_correct: s.problems_correct,
    score: s.state?.papaya_score_accumulator ?? 0,
  }));

  const milestones = MILESTONES.map(m => ({
    id: m.id,
    name: m.name,
    threshold: m.threshold,
    emoji: m.emoji,
    description: m.description,
    earned: earnedIds.has(m.id) || allTimePoints >= m.threshold,
  }));

  return NextResponse.json({
    display_name: user.display_name,
    weekly_score: weeklyScore,
    weekly_rank: weeklyRank != null ? weeklyRank + 1 : null,
    all_time: allTime,
    all_time_points: allTimePoints,
    recent_sessions: sessions,
    milestones,
  });
}
