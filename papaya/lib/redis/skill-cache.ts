import { redis } from "@/lib/redis";
import { DEFAULT_MU, DEFAULT_SIGMA } from "@/lib/db/queries/skills";

const SKILL_TTL = 60 * 60 * 24 * 7; // 7 days

interface CachedSkill {
  mu: number;
  sigma: number;
  attempts: number;
  correct: number;
  last_updated_at: string;
}

function skillKey(userId: string, topicId: string): string {
  return `skill:${userId}:${topicId}`;
}

export async function getCachedSkill(
  userId: string,
  topicId: string
): Promise<CachedSkill | null> {
  return redis.get<CachedSkill>(skillKey(userId, topicId));
}

export async function setCachedSkill(
  userId: string,
  topicId: string,
  skill: CachedSkill
): Promise<void> {
  await redis.set(skillKey(userId, topicId), skill, { ex: SKILL_TTL });
}

export async function getOrDefaultSkill(
  userId: string,
  topicId: string
): Promise<CachedSkill> {
  const cached = await getCachedSkill(userId, topicId);
  if (cached) return cached;
  return {
    mu: DEFAULT_MU,
    sigma: DEFAULT_SIGMA,
    attempts: 0,
    correct: 0,
    last_updated_at: new Date().toISOString(),
  };
}

export async function invalidateSkillCache(
  userId: string,
  topicId: string
): Promise<void> {
  await redis.del(skillKey(userId, topicId));
}
