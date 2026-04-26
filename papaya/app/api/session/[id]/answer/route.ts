/**
 * POST /api/session/[id]/answer
 *
 * The hottest route in the system. On each answer:
 * 1. Score answer
 * 2. Bayesian skill update → Redis immediately
 * 3. Papaya Score delta → Redis leaderboard sorted set
 * 4. Select next problem (library first, Claude fallback)
 * 5. Async: flush to Postgres
 * 6. Return result
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSessionState, setSessionState } from "@/lib/redis/session-state";
import { getSession, recordAnswer, updateSessionState } from "@/lib/db/queries/sessions";
import { getCachedSkill, setCachedSkill } from "@/lib/redis/skill-cache";
import { getSkillState, upsertSkillState, DEFAULT_MU, DEFAULT_SIGMA } from "@/lib/db/queries/skills";
import { getProblemById, selectProblemsForSession } from "@/lib/db/queries/problems";
import { incrementLeaderboardScore } from "@/lib/redis/leaderboard-cache";
import { incrementAllTimePoints } from "@/lib/redis/points-cache";
import { getCrossedMilestones, awardAchievement, type Milestone } from "@/lib/achievements/milestones";
import { updateSkill, muToTargetDifficulty } from "@/lib/skill/model";
import { scoreProblem } from "@/lib/scoring/papaya-score";
import type { Problem } from "@/types/problem";

const AnswerBody = z.object({
  problem_id: z.string().uuid(),
  answer: z.string().min(1),
  time_spent_seconds: z.number().min(0).max(3600),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = AnswerBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { problem_id, answer, time_spent_seconds } = parsed.data;

  // Load session state from Redis (fast) or DB (cold start)
  let state = await getSessionState(sessionId);
  if (!state) {
    const dbSession = await getSession(sessionId);
    if (!dbSession || dbSession.user_id !== user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    state = dbSession.state;
  }

  // Load the problem
  const problem = await getProblemById(problem_id);
  if (!problem) return NextResponse.json({ error: "Problem not found" }, { status: 404 });

  // ─── Score the answer ────────────────────────────────────────────────────
  const is_correct = checkAnswer(
    answer,
    problem.correct_answer,
    problem.answer_type,
    problem.tolerance
  );
  const hintsUsed = Math.min(state.hints_this_problem, 3) as 0 | 1 | 2 | 3;

  // ─── Skill update ────────────────────────────────────────────────────────
  const cached = await getCachedSkill(user.id, problem.topic_id);
  const dbSkill = cached ?? await getSkillState(user.id, problem.topic_id);
  const mu_before = dbSkill?.mu ?? DEFAULT_MU;
  const sigma_before = dbSkill?.sigma ?? DEFAULT_SIGMA;

  const updated = updateSkill(
    { mu: mu_before, sigma: sigma_before },
    {
      difficulty: problem.difficulty as 1 | 2 | 3 | 4 | 5,
      correct: is_correct,
      hintsUsed,
    }
  );

  // Write skill to Redis immediately
  await setCachedSkill(user.id, problem.topic_id, {
    mu: updated.mu,
    sigma: updated.sigma,
    attempts: (dbSkill?.attempts ?? 0) + 1,
    correct: (dbSkill?.correct ?? 0) + (is_correct ? 1 : 0),
    last_updated_at: new Date().toISOString(),
  });

  // ─── Papaya Score ────────────────────────────────────────────────────────
  const scoreBreakdown = scoreProblem({
    correct: is_correct,
    difficulty: problem.difficulty as 1 | 2 | 3 | 4 | 5,
    timeSpentSeconds: time_spent_seconds,
    hintsUsed,
  });

  let milestoneEarned: Pick<Milestone, "id" | "name" | "emoji" | "description"> | null = null;
  if (scoreBreakdown.total > 0) {
    await incrementLeaderboardScore(user.id, scoreBreakdown.total);
    const newTotal = await incrementAllTimePoints(user.id, scoreBreakdown.total);
    const prevTotal = newTotal - scoreBreakdown.total;
    const crossed = getCrossedMilestones(prevTotal, newTotal);
    for (const milestone of crossed) {
      const isNew = await awardAchievement(user.id, milestone.id);
      if (isNew) {
        milestoneEarned = { id: milestone.id, name: milestone.name, emoji: milestone.emoji, description: milestone.description };
        break;
      }
    }
  }

  // ─── Advance session state ───────────────────────────────────────────────
  const nextIndex = state.current_index + 1;
  const sessionComplete = nextIndex >= state.problem_queue.length;

  let nextProblem: Problem | null = null;
  if (!sessionComplete) {
    const nextId = state.problem_queue[nextIndex];
    nextProblem = await getProblemById(nextId);

    // If problem was deleted/unavailable, try to fetch a replacement
    if (!nextProblem) {
      const replacement = await selectProblemsForSession(
        problem.topic_id,
        muToTargetDifficulty(updated.mu),
        1,
        state.problem_queue
      );
      nextProblem = replacement[0] ?? null;
      if (nextProblem) {
        state.problem_queue[nextIndex] = nextProblem.id;
      }
    }
  }

  const newState = {
    ...state,
    current_index: nextIndex,
    hints_this_problem: 0,
    timer_started_at: sessionComplete ? null : new Date().toISOString(),
    papaya_score_accumulator: state.papaya_score_accumulator + scoreBreakdown.total,
    pending_skill_deltas: [
      ...state.pending_skill_deltas,
      { topic_id: problem.topic_id, mu_before, mu_after: updated.mu },
    ],
  };

  // Write updated state to Redis
  await setSessionState(sessionId, newState);

  // ─── Async Postgres flush (fire-and-forget) ──────────────────────────────
  void flushToPostgres({
    sessionId,
    userId: user.id,
    problemId: problem_id,
    userAnswer: answer,
    isCorrect: is_correct,
    timeSpentSeconds: time_spent_seconds,
    hintsUsed,
    muBefore: mu_before,
    muAfter: updated.mu,
    topicId: problem.topic_id,
    newState,
    sessionComplete,
  });

  return NextResponse.json({
    is_correct,
    correct_answer: is_correct ? null : problem.correct_answer,
    explanation: problem.explanation,
    skill_delta: updated.delta,
    papaya_points_earned: scoreBreakdown.total,
    next_problem: nextProblem,
    session_complete: sessionComplete,
    score_breakdown: scoreBreakdown,
    milestone_earned: milestoneEarned,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeAnswer(s: string): string {
  // Strip "var=" prefix so "x=12" and "n = 5" are treated as "12" and "5"
  return s.trim().toLowerCase().replace(/^[a-z_][a-z_0-9]*\s*=\s*/i, "");
}

function checkAnswer(
  userAnswer: string,
  correctAnswer: string,
  answerType: string,
  tolerance: number | null
): boolean {
  const ua = normalizeAnswer(userAnswer);
  const ca = normalizeAnswer(correctAnswer);

  if (answerType === "mc") {
    return ua === ca;
  }

  // Numeric / grid-in: compare as numbers with tolerance
  const uNum = parseFloat(ua.replace(/,/g, ""));
  const cNum = parseFloat(ca.replace(/,/g, ""));

  if (isNaN(uNum) || isNaN(cNum)) return ua === ca;

  const tol = tolerance ?? 0.001;
  return Math.abs(uNum - cNum) <= tol;
}

async function flushToPostgres(params: {
  sessionId: string;
  userId: string;
  problemId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  hintsUsed: number;
  muBefore: number;
  muAfter: number;
  topicId: string;
  newState: typeof Object.prototype;
  sessionComplete: boolean;
}) {
  try {
    await recordAnswer({
      sessionId: params.sessionId,
      problemId: params.problemId,
      userAnswer: params.userAnswer,
      isCorrect: params.isCorrect,
      timeSpentSeconds: params.timeSpentSeconds,
      hintsUsed: params.hintsUsed,
      skillMuBefore: params.muBefore,
      skillMuAfter: params.muAfter,
    });

    await upsertSkillState(
      params.userId,
      params.topicId,
      params.muAfter,
      0.2, // sigma will be overwritten from Redis on next read
      1,
      params.isCorrect ? 1 : 0
    );

    const dbSession = await import("@/lib/db/queries/sessions");
    await dbSession.updateSessionState(params.sessionId, params.newState as never);

    if (params.sessionComplete) {
      await dbSession.endSession(params.sessionId);
    }
  } catch {
    // Postgres flush failure is non-fatal — state is safe in Redis
  }
}
