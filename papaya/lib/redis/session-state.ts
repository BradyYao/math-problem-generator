import { redis } from "@/lib/redis";
import type { SessionState } from "@/lib/db/queries/sessions";

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

function sessionKey(sessionId: string): string {
  return `session:${sessionId}:state`;
}

export async function getSessionState(
  sessionId: string
): Promise<SessionState | null> {
  return redis.get<SessionState>(sessionKey(sessionId));
}

export async function setSessionState(
  sessionId: string,
  state: SessionState
): Promise<void> {
  await redis.set(sessionKey(sessionId), state, { ex: SESSION_TTL });
}

export async function deleteSessionState(sessionId: string): Promise<void> {
  await redis.del(sessionKey(sessionId));
}
