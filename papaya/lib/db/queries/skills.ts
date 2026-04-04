import { sql } from "@/lib/db";

export interface SkillState {
  id: string;
  user_id: string;
  topic_id: string;
  mu: number;
  sigma: number;
  attempts: number;
  correct: number;
  last_updated_at: string;
}

export const DEFAULT_MU = 0.5;
export const DEFAULT_SIGMA = 0.3;

export async function getSkillState(
  userId: string,
  topicId: string
): Promise<SkillState | null> {
  const rows = await sql`
    SELECT * FROM skill_states
    WHERE user_id = ${userId} AND topic_id = ${topicId}
  `;
  return (rows[0] as SkillState) ?? null;
}

export async function getAllSkillStates(userId: string): Promise<SkillState[]> {
  return sql`
    SELECT * FROM skill_states
    WHERE user_id = ${userId}
    ORDER BY last_updated_at DESC
  ` as unknown as Promise<SkillState[]>;
}

export async function upsertSkillState(
  userId: string,
  topicId: string,
  mu: number,
  sigma: number,
  attemptsIncrement: number,
  correctIncrement: number
): Promise<SkillState> {
  const rows = await sql`
    INSERT INTO skill_states (user_id, topic_id, mu, sigma, attempts, correct)
    VALUES (${userId}, ${topicId}, ${mu}, ${sigma}, ${attemptsIncrement}, ${correctIncrement})
    ON CONFLICT (user_id, topic_id) DO UPDATE SET
      mu = ${mu},
      sigma = ${sigma},
      attempts = skill_states.attempts + ${attemptsIncrement},
      correct = skill_states.correct + ${correctIncrement},
      last_updated_at = now()
    RETURNING *
  `;
  return rows[0] as SkillState;
}

export async function seedSkillStates(
  userId: string,
  topicSkills: { topic_id: string; mu: number; sigma: number }[]
): Promise<void> {
  for (const { topic_id, mu, sigma } of topicSkills) {
    await sql`
      INSERT INTO skill_states (user_id, topic_id, mu, sigma)
      VALUES (${userId}, ${topic_id}, ${mu}, ${sigma})
      ON CONFLICT (user_id, topic_id) DO NOTHING
    `;
  }
}
