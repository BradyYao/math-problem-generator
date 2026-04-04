import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSessionState, deleteSessionState } from "@/lib/redis/session-state";
import { getSession, endSession, updateSessionState } from "@/lib/db/queries/sessions";
import { upsertSkillState } from "@/lib/db/queries/skills";
import { getCachedSkill } from "@/lib/redis/skill-cache";

export async function POST(
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

  if (dbSession.is_complete) {
    return NextResponse.json({ error: "Session already ended" }, { status: 410 });
  }

  const state = await getSessionState(sessionId) ?? dbSession.state;

  // Flush pending skill deltas to Postgres
  const uniqueTopics = new Map<string, { mu_before: number; mu_after: number }>();
  for (const delta of state.pending_skill_deltas) {
    uniqueTopics.set(delta.topic_id, { mu_before: delta.mu_before, mu_after: delta.mu_after });
  }

  await Promise.allSettled(
    Array.from(uniqueTopics.entries()).map(async ([topicId, { mu_after }]) => {
      const cached = await getCachedSkill(user.id, topicId);
      await upsertSkillState(
        user.id,
        topicId,
        cached?.mu ?? mu_after,
        cached?.sigma ?? 0.2,
        cached?.attempts ?? 1,
        cached?.correct ?? 0
      );
    })
  );

  // Flush final session state and mark complete
  await updateSessionState(sessionId, state as never);
  await endSession(sessionId);
  await deleteSessionState(sessionId);

  return NextResponse.json({ success: true, session_id: sessionId });
}
