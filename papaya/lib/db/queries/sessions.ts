import { sql } from "@/lib/db";

export interface SessionState {
  problem_queue: string[];
  current_index: number;
  pending_skill_deltas: Array<{
    topic_id: string;
    mu_before: number;
    mu_after: number;
  }>;
  hints_this_problem: number;
  timer_started_at: string | null;
  papaya_score_accumulator: number;
}

export interface Session {
  id: string;
  user_id: string;
  mode: "practice" | "quickfire" | "assessment" | "challenge";
  topic_ids: string[];
  started_at: string;
  ended_at: string | null;
  time_budget_minutes: number | null;
  problems_delivered: number;
  problems_correct: number;
  state: SessionState;
  is_complete: boolean;
  challenge_id: string | null;
}

export interface SessionAnswer {
  id: string;
  session_id: string;
  problem_id: string;
  user_answer: string;
  is_correct: boolean;
  time_spent_seconds: number;
  hints_used: number;
  skill_mu_before: number | null;
  skill_mu_after: number | null;
  answered_at: string;
}

export async function createSession(params: {
  userId: string;
  mode: Session["mode"];
  topicIds: string[];
  timeBudgetMinutes?: number;
  challengeId?: string;
  initialState: SessionState;
}): Promise<Session> {
  const rows = await sql`
    INSERT INTO sessions (user_id, mode, topic_ids, time_budget_minutes, challenge_id, state)
    VALUES (
      ${params.userId},
      ${params.mode},
      ${params.topicIds},
      ${params.timeBudgetMinutes ?? null},
      ${params.challengeId ?? null},
      ${JSON.stringify(params.initialState)}
    )
    RETURNING *
  `;
  return rows[0] as Session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const rows = await sql`SELECT * FROM sessions WHERE id = ${sessionId}`;
  return (rows[0] as Session) ?? null;
}

export async function updateSessionState(
  sessionId: string,
  state: SessionState,
  problemsDelivered?: number,
  problemsCorrect?: number
): Promise<void> {
  await sql`
    UPDATE sessions SET
      state = ${JSON.stringify(state)},
      problems_delivered = COALESCE(${problemsDelivered ?? null}, problems_delivered),
      problems_correct = COALESCE(${problemsCorrect ?? null}, problems_correct)
    WHERE id = ${sessionId}
  `;
}

export async function endSession(sessionId: string): Promise<Session | null> {
  const rows = await sql`
    UPDATE sessions SET
      ended_at = now(),
      is_complete = true
    WHERE id = ${sessionId}
    RETURNING *
  `;
  return (rows[0] as Session) ?? null;
}

export async function recordAnswer(params: {
  sessionId: string;
  problemId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  hintsUsed: number;
  skillMuBefore?: number;
  skillMuAfter?: number;
}): Promise<SessionAnswer> {
  const rows = await sql`
    INSERT INTO session_answers (
      session_id, problem_id, user_answer, is_correct,
      time_spent_seconds, hints_used, skill_mu_before, skill_mu_after
    ) VALUES (
      ${params.sessionId}, ${params.problemId}, ${params.userAnswer},
      ${params.isCorrect}, ${params.timeSpentSeconds}, ${params.hintsUsed},
      ${params.skillMuBefore ?? null}, ${params.skillMuAfter ?? null}
    )
    RETURNING *
  `;
  return rows[0] as SessionAnswer;
}

export async function getSessionAnswers(sessionId: string): Promise<SessionAnswer[]> {
  return sql`
    SELECT * FROM session_answers
    WHERE session_id = ${sessionId}
    ORDER BY answered_at ASC
  ` as unknown as Promise<SessionAnswer[]>;
}

export async function getRecentSessions(
  userId: string,
  limit = 10
): Promise<Session[]> {
  return sql`
    SELECT * FROM sessions
    WHERE user_id = ${userId}
    ORDER BY started_at DESC
    LIMIT ${limit}
  ` as unknown as Promise<Session[]>;
}

export async function getActivityHeatmap(
  userId: string,
  days = 365
): Promise<Array<{ date: string; count: number }>> {
  return sql`
    SELECT
      DATE(started_at) as date,
      COUNT(*)::int as count
    FROM sessions
    WHERE user_id = ${userId}
      AND started_at >= now() - interval '1 day' * ${days}
      AND is_complete = true
    GROUP BY DATE(started_at)
    ORDER BY date ASC
  ` as unknown as Promise<Array<{ date: string; count: number }>>;
}
