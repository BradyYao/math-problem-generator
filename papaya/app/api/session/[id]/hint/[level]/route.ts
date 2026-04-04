import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSessionState, setSessionState } from "@/lib/redis/session-state";
import { getSession } from "@/lib/db/queries/sessions";
import { getProblemById } from "@/lib/db/queries/problems";
import { generateHint } from "@/lib/ai/problem-generator";
import { sql } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; level: string }> }
) {
  const { id: sessionId, level: levelStr } = await params;
  const level = parseInt(levelStr) as 1 | 2 | 3;

  if (![1, 2, 3].includes(level)) {
    return NextResponse.json({ error: "Hint level must be 1, 2, or 3" }, { status: 400 });
  }

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Load session state
  let state = await getSessionState(sessionId);
  if (!state) {
    const dbSession = await getSession(sessionId);
    if (!dbSession || dbSession.user_id !== user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    state = dbSession.state;
  }

  // Enforce progressive reveal: can't skip to level 3 without level 2
  if (level > 1 && state.hints_this_problem < level - 1) {
    return NextResponse.json(
      { error: `Must view hint ${level - 1} before hint ${level}` },
      { status: 400 }
    );
  }

  // Get current problem
  const currentProblemId = state.problem_queue[state.current_index];
  const problem = await getProblemById(currentProblemId);
  if (!problem) return NextResponse.json({ error: "Problem not found" }, { status: 404 });

  // Get hint text — from DB or generate on-demand
  const hintField = `hint_${level}` as "hint_1" | "hint_2" | "hint_3";
  let hintText = problem[hintField];

  if (!hintText) {
    // Get topic grade band for tone
    const topicRows = await sql`SELECT grade_band FROM topics WHERE id = ${problem.topic_id}`;
    const gradeBand = (topicRows[0] as { grade_band: string })?.grade_band ?? "6-8";

    hintText = await generateHint({
      problemId: problem.id,
      stemLatex: problem.stem_latex,
      level,
      gradeBand: gradeBand as "k2" | "3-5" | "6-8" | "9-12",
    });
  }

  // Update hints_this_problem in session state
  if (level > state.hints_this_problem) {
    const updatedState = { ...state, hints_this_problem: level };
    await setSessionState(sessionId, updatedState);
  }

  const isLast = level === 3 || (!problem.hint_2 && level === 1);

  return NextResponse.json({
    level,
    text: hintText,
    is_last: isLast,
    hints_used: Math.max(level, state.hints_this_problem),
  });
}
