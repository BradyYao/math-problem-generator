/**
 * POST /api/session/begin
 * One-shot endpoint used by the onboarding flow.
 * Handles user creation (Clerk upsert or guest), picks topics, and starts a session.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
import { sql } from "@/lib/db";
import { getUserByClerkId, getUserByGuestToken, createGuestUser } from "@/lib/db/queries/users";
import type { User } from "@/lib/db/queries/users";
import { createSession } from "@/lib/db/queries/sessions";
import { setSessionState } from "@/lib/redis/session-state";
import { selectProblemsForSession, getSeenProblemIds } from "@/lib/db/queries/problems";
import { getOrGenerateProblem } from "@/lib/ai/problem-generator";
import { estimateProblemCount } from "@/lib/skill/selection";
import { GUEST_COOKIE, buildGuestCookie } from "@/lib/auth/guest";
import type { SessionState } from "@/lib/db/queries/sessions";
import type { Problem } from "@/types/problem";

const Body = z.object({
  topic_ids: z.array(z.string()).min(1).max(5),
  time_budget_minutes: z.number().min(1).max(120).default(20),
  mode: z.enum(["practice", "quickfire", "assessment"]).default("practice"),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { topic_ids, time_budget_minutes, mode } = parsed.data;

  // --- Resolve or create user ---
  let user = null;
  let guestToken: string | null = null;

  const { userId: clerkId } = await auth();

  if (clerkId) {
    user = await getUserByClerkId(clerkId);

    if (!user) {
      const rows = await sql`
        INSERT INTO users (clerk_id)
        VALUES (${clerkId})
        ON CONFLICT (clerk_id) DO UPDATE SET last_active_at = now()
        RETURNING *
      `;
      user = rows[0] as User;
    }
  } else {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const match = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${GUEST_COOKIE}=`));
    const existingToken = match?.split("=")[1] ?? null;

    if (existingToken) {
      user = await getUserByGuestToken(existingToken);
    }

    if (!user) {
      guestToken = nanoid(32);
      user = await createGuestUser(guestToken);
    }
  }

  if (!user) {
    return NextResponse.json({ error: "Could not resolve user" }, { status: 500 });
  }

  // --- Fetch all topic metadata in one query ---
  const topicRows = await sql`
    SELECT id, name, grade_band FROM topics WHERE id = ANY(${topic_ids}::text[])
  ` as Array<{ id: string; name: string; grade_band: string }>;
  const topicMap = new Map(topicRows.map((r) => [r.id, r]));

  // --- Build problem queue ---
  const totalProblems = estimateProblemCount(time_budget_minutes);
  const perTopic = Math.ceil(totalProblems / topic_ids.length);

  // Fetch problems the user has already answered across all prior sessions
  // so we can exclude them from the new queue.
  const previouslySeenIds = await getSeenProblemIds(user.id);

  // Step 1: fetch library problems for all topics in parallel, excluding previously seen
  const perTopicProblems = await Promise.all(
    topic_ids.map((topicId) => selectProblemsForSession(topicId, 3, perTopic, previouslySeenIds))
  );

  // Collect results and track deficits, deduplicating across topics.
  // Seed the set with previously-seen IDs so AI fill also avoids them.
  const problemObjects: Problem[] = [];
  const queueIds = new Set<string>(previouslySeenIds);
  const deficits: Array<{ topicId: string; count: number }> = [];

  for (let i = 0; i < topic_ids.length; i++) {
    const topicId = topic_ids[i];
    const problems = perTopicProblems[i];

    for (const p of problems) {
      if (!queueIds.has(p.id)) {
        queueIds.add(p.id);
        problemObjects.push(p);
      }
    }

    const deficit = perTopic - problems.length;
    if (deficit > 0 && topicMap.has(topicId)) {
      deficits.push({ topicId, count: deficit });
    }
  }

  // Step 2: fill deficits with AI generation in small batches.
  // Batches of 5 avoid rate limits, and each batch sees previous results (no duplicates).
  const BATCH_SIZE = 5;
  const difficulties: Array<1 | 2 | 3 | 4 | 5> = [3, 3, 3, 2, 4]; // ~70/20/10 spread per batch

  for (const { topicId, count } of deficits) {
    const meta = topicMap.get(topicId)!;

    for (let batchStart = 0; batchStart < count && problemObjects.length < totalProblems; batchStart += BATCH_SIZE) {
      const batchCount = Math.min(BATCH_SIZE, count - batchStart, totalProblems - problemObjects.length);
      // Pass the full queueIds set (includes previously-seen + current session) as exclusions
      const currentIds = [...queueIds];

      const batch = Array.from({ length: batchCount }, (_, i) =>
        getOrGenerateProblem(
          {
            topicId,
            topicName: meta.name,
            gradeBand: meta.grade_band as "k2" | "3-5" | "6-8" | "9-12",
            difficulty: difficulties[(batchStart + i) % difficulties.length],
            userId: user!.id,
            variationSeed: batchStart + i,
          },
          currentIds
        )
      );

      const results = await Promise.allSettled(batch);
      for (const result of results) {
        if (result.status === "fulfilled" && !queueIds.has(result.value.id)) {
          queueIds.add(result.value.id);
          problemObjects.push(result.value);
        }
      }
    }
  }

  if (problemObjects.length === 0) {
    return NextResponse.json(
      { error: "No problems available for the selected topics. Try different topics." },
      { status: 422 }
    );
  }

  const problemQueue = problemObjects.map((p) => p.id);
  const firstProblem = problemObjects[0];

  // --- Create session ---
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
    timeBudgetMinutes: time_budget_minutes,
    initialState,
  });

  // Fire Redis write without awaiting — it's a cache, not source of truth
  setSessionState(session.id, initialState);

  const responseBody = {
    session_id: session.id,
    problem: firstProblem,
    total_problems: problemQueue.length,
    time_budget_minutes,
  };

  const res = NextResponse.json(responseBody);

  if (guestToken) {
    const cookieDef = buildGuestCookie(guestToken);
    res.cookies.set(cookieDef.name, cookieDef.value, {
      httpOnly: cookieDef.httpOnly,
      secure: cookieDef.secure,
      sameSite: cookieDef.sameSite,
      maxAge: cookieDef.maxAge,
      path: cookieDef.path,
    });
  }

  return res;
}
