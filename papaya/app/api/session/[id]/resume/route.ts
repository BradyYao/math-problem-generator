import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSessionState } from "@/lib/redis/session-state";
import { getSession } from "@/lib/db/queries/sessions";
import { getProblemById } from "@/lib/db/queries/problems";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Try Redis first, fall back to DB
  let state = await getSessionState(sessionId);
  let dbSession = null;

  if (!state) {
    dbSession = await getSession(sessionId);
    if (!dbSession || dbSession.user_id !== user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (dbSession.is_complete) {
      return NextResponse.json({ error: "Session already complete" }, { status: 410 });
    }
    state = dbSession.state;
  } else {
    // Verify ownership via DB
    dbSession = await getSession(sessionId);
    if (!dbSession || dbSession.user_id !== user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
  }

  // Get current problem
  const currentProblemId = state.problem_queue[state.current_index];
  if (!currentProblemId) {
    return NextResponse.json({ error: "Session has no more problems" }, { status: 410 });
  }

  const currentProblem = await getProblemById(currentProblemId);
  if (!currentProblem) {
    return NextResponse.json({ error: "Problem not found" }, { status: 404 });
  }

  const elapsed = state.timer_started_at
    ? Math.floor((Date.now() - new Date(state.timer_started_at).getTime()) / 1000)
    : 0;

  return NextResponse.json({
    session_id: sessionId,
    mode: dbSession.mode,
    current_problem: currentProblem,
    current_index: state.current_index,
    total_problems: state.problem_queue.length,
    hints_this_problem: state.hints_this_problem,
    papaya_score: state.papaya_score_accumulator,
    time_elapsed_seconds: elapsed,
    time_budget_minutes: dbSession.time_budget_minutes,
  });
}
