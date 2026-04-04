import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSession } from "@/lib/db/queries/sessions";
import { sql } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbSession = await getSession(sessionId);
  if (!dbSession || dbSession.user_id !== user.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Fetch all answers for this session with problem metadata
  const answers = await sql`
    SELECT
      sa.problem_id,
      sa.user_answer,
      sa.is_correct,
      sa.time_spent_seconds,
      sa.hints_used,
      sa.skill_mu_before,
      sa.skill_mu_after,
      p.topic_id,
      p.difficulty,
      p.stem_latex,
      p.correct_answer,
      p.explanation,
      t.name AS topic_name
    FROM session_answers sa
    JOIN problems p ON p.id = sa.problem_id
    JOIN topics t ON t.id = p.topic_id
    WHERE sa.session_id = ${sessionId}
    ORDER BY sa.created_at
  ` as Array<{
    problem_id: string;
    user_answer: string;
    is_correct: boolean;
    time_spent_seconds: number;
    hints_used: number;
    skill_mu_before: number;
    skill_mu_after: number;
    topic_id: string;
    difficulty: number;
    stem_latex: string;
    correct_answer: string;
    explanation: string;
    topic_name: string;
  }>;

  const totalAnswered = answers.length;
  const totalCorrect = answers.filter(a => a.is_correct).length;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const totalTimeSeconds = answers.reduce((sum, a) => sum + a.time_spent_seconds, 0);

  // Per-topic breakdown
  const topicMap = new Map<string, {
    topic_id: string;
    topic_name: string;
    answered: number;
    correct: number;
    mu_before: number;
    mu_after: number;
  }>();

  for (const a of answers) {
    const existing = topicMap.get(a.topic_id);
    if (!existing) {
      topicMap.set(a.topic_id, {
        topic_id: a.topic_id,
        topic_name: a.topic_name,
        answered: 1,
        correct: a.is_correct ? 1 : 0,
        mu_before: a.skill_mu_before,
        mu_after: a.skill_mu_after,
      });
    } else {
      existing.answered++;
      if (a.is_correct) existing.correct++;
      existing.mu_after = a.skill_mu_after; // last update wins
    }
  }

  const topicBreakdown = Array.from(topicMap.values()).map(t => ({
    ...t,
    accuracy: Math.round((t.correct / t.answered) * 100),
    skill_delta: Math.round((t.mu_after - t.mu_before) * 100) / 100,
  }));

  // Papaya score from session state
  const papayaScore = dbSession.state?.papaya_score_accumulator ?? 0;

  return NextResponse.json({
    session_id: sessionId,
    mode: dbSession.mode,
    total_answered: totalAnswered,
    total_correct: totalCorrect,
    accuracy,
    total_time_seconds: totalTimeSeconds,
    papaya_score: papayaScore,
    topic_breakdown: topicBreakdown,
    answers: answers.map(a => ({
      problem_id: a.problem_id,
      stem_latex: a.stem_latex,
      user_answer: a.user_answer,
      correct_answer: a.correct_answer,
      is_correct: a.is_correct,
      explanation: a.is_correct ? a.explanation : null,
      hints_used: a.hints_used,
      time_spent_seconds: a.time_spent_seconds,
      topic_name: a.topic_name,
      difficulty: a.difficulty,
    })),
  });
}
