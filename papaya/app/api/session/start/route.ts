import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createSession } from "@/lib/db/queries/sessions";
import { setSessionState } from "@/lib/redis/session-state";
import { getCachedSkill } from "@/lib/redis/skill-cache";
import { getSkillState, DEFAULT_MU } from "@/lib/db/queries/skills";
import { selectProblemsForSession } from "@/lib/db/queries/problems";
import { getOrGenerateProblem } from "@/lib/ai/problem-generator";
import { getTopicsWithFallback } from "@/lib/db/queries/topics";
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
  const totalProblems = mode === "quickfire" ? 3 : estimateProblemCount(timeBudget);
  const perTopic = Math.ceil(totalProblems / topic_ids.length);

  // Batch all topic metadata and skill lookups in parallel
  const [topicMap, ...skillResults] = await Promise.all([
    getTopicsWithFallback(topic_ids),
    ...topic_ids.map(async (topicId) => {
      const cached = await getCachedSkill(user.id, topicId);
      const mu = cached?.mu ?? (await getSkillState(user.id, topicId))?.mu ?? DEFAULT_MU;
      return { topicId, difficulty: muToTargetDifficulty(mu) };
    }),
  ]);

  const difficultyMap = new Map(
    (skillResults as Array<{ topicId: string; difficulty: number }>).map((s) => [s.topicId, s.difficulty])
  );

  // Fetch library problems for all topics in parallel
  const perTopicProblems = await Promise.all(
    topic_ids.map((topicId) =>
      selectProblemsForSession(topicId, difficultyMap.get(topicId) ?? 3, perTopic)
    )
  );

  const problemQueue: string[] = [];
  const deficits: Array<{ topicId: string; difficulty: number; count: number }> = [];

  for (let i = 0; i < topic_ids.length; i++) {
    const topicId = topic_ids[i];
    const problems = perTopicProblems[i] as Problem[];
    problemQueue.push(...problems.map((p) => p.id));

    const deficit = Math.min(perTopic - problems.length, 2); // cap AI fill at 2 per topic
    if (deficit > 0 && topicMap.has(topicId)) {
      deficits.push({ topicId, difficulty: difficultyMap.get(topicId) ?? 3, count: deficit });
    }
  }

  // Fill deficits in one parallel batch (capped at 5 total)
  if (deficits.length > 0) {
    const jobs = deficits.flatMap(({ topicId, difficulty, count }) => {
      const meta = topicMap.get(topicId)!;
      return Array.from({ length: count }, () => ({ topicId, difficulty, meta }));
    }).slice(0, 5);

    const results = await Promise.allSettled(
      jobs.map(({ topicId, difficulty, meta }) =>
        getOrGenerateProblem({
          topicId,
          topicName: meta.name,
          gradeBand: meta.grade_band as "k2" | "3-5" | "6-8" | "9-12",
          difficulty: difficulty as 1 | 2 | 3 | 4 | 5,
          userId: user.id,
        }, problemQueue)
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled") problemQueue.push(result.value.id);
    }
  }

  if (problemQueue.length === 0) {
    return NextResponse.json(
      { error: "No problems available for the selected topics" },
      { status: 422 }
    );
  }

  const { getProblemById } = await import("@/lib/db/queries/problems");
  const firstProblem = await getProblemById(problemQueue[0]);
  if (!firstProblem) {
    return NextResponse.json({ error: "Failed to load first problem" }, { status: 500 });
  }

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

  await setSessionState(session.id, initialState);

  return NextResponse.json({
    session_id: session.id,
    problem: firstProblem,
    total_problems: problemQueue.length,
    time_budget_minutes: timeBudget,
  });
}
