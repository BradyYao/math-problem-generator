import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createSession } from "@/lib/db/queries/sessions";
import { setSessionState } from "@/lib/redis/session-state";
import { getCachedSkill } from "@/lib/redis/skill-cache";
import { getSkillState, DEFAULT_MU } from "@/lib/db/queries/skills";
import { selectProblemsForSession } from "@/lib/db/queries/problems";
import { getOrGenerateProblem } from "@/lib/ai/problem-generator";
import { muToTargetDifficulty } from "@/lib/skill/model";
import { estimateProblemCount } from "@/lib/skill/selection";
import type { SessionState } from "@/lib/db/queries/sessions";
import type { Problem } from "@/types/problem";

const StartSessionBody = z.object({
  topic_ids: z.array(z.string()).min(1).max(5),
  time_budget_minutes: z.number().min(1).max(120).optional(),
  mode: z.enum(["practice", "quickfire", "assessment"]).default("practice"),
});

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = StartSessionBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { topic_ids, time_budget_minutes, mode } = parsed.data;
  const timeBudget = time_budget_minutes ?? (mode === "quickfire" ? 5 : 20);
  const totalProblems = mode === "quickfire"
    ? 3
    : estimateProblemCount(timeBudget);

  // Build problem queue: select problems for each topic, weighted
  const problemQueue: string[] = [];
  const perTopic = Math.ceil(totalProblems / topic_ids.length);

  for (const topicId of topic_ids) {
    // Get skill state for this topic
    const cached = await getCachedSkill(user.id, topicId);
    const mu = cached?.mu ?? (await getSkillState(user.id, topicId))?.mu ?? DEFAULT_MU;
    const targetDifficulty = muToTargetDifficulty(mu);

    // Try library first
    const problems = await selectProblemsForSession(topicId, targetDifficulty, perTopic);
    problemQueue.push(...problems.map((p: Problem) => p.id));

    // If library short, fill with AI generation (up to 2 problems)
    const deficit = perTopic - problems.length;
    if (deficit > 0) {
      // Get topic metadata for AI generation
      const topicRows = await import("@/lib/db").then(({ sql }) =>
        sql`SELECT name, grade_band FROM topics WHERE id = ${topicId}`
      );
      const topicMeta = topicRows[0] as { name: string; grade_band: string } | undefined;
      if (topicMeta) {
        for (let i = 0; i < Math.min(deficit, 2); i++) {
          try {
            const gen = await getOrGenerateProblem({
              topicId,
              topicName: topicMeta.name,
              gradeBand: topicMeta.grade_band as "k2" | "3-5" | "6-8" | "9-12",
              difficulty: targetDifficulty,
              userId: user.id,
            }, problemQueue);
            problemQueue.push(gen.id);
          } catch {
            // If AI fails, session continues with fewer problems
          }
        }
      }
    }
  }

  if (problemQueue.length === 0) {
    return NextResponse.json(
      { error: "No problems available for the selected topics" },
      { status: 422 }
    );
  }

  // Fetch the first problem
  const { getProblemById } = await import("@/lib/db/queries/problems");
  const firstProblem = await getProblemById(problemQueue[0]);
  if (!firstProblem) {
    return NextResponse.json({ error: "Failed to load first problem" }, { status: 500 });
  }

  // Create session in DB
  const initialState: SessionState = {
    problem_queue: problemQueue,
    current_index: 0,
    pending_skill_deltas: [],
    hints_this_problem: 0,
    timer_started_at: new Date().toISOString(),
    papaya_score_accumulator: 0,
  };

  const session = await createSession({
    userId: user.id,
    mode,
    topicIds: topic_ids,
    timeBudgetMinutes: timeBudget,
    initialState,
  });

  // Write state to Redis immediately
  await setSessionState(session.id, initialState);

  return NextResponse.json({
    session_id: session.id,
    problem: firstProblem,
    total_problems: problemQueue.length,
    time_budget_minutes: timeBudget,
  });
}
