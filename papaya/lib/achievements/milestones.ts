import { sql } from "@/lib/db";

export interface Milestone {
  id: string;
  name: string;
  threshold: number;
  emoji: string;
  description: string;
}

export const MILESTONES: Milestone[] = [
  { id: "papaya_100",   name: "First Harvest",   threshold: 100,   emoji: "🌱", description: "Earned your first 100 Papaya Points" },
  { id: "papaya_500",   name: "Growing Strong",  threshold: 500,   emoji: "🌿", description: "500 Papaya Points earned" },
  { id: "papaya_1000",  name: "Power Player",    threshold: 1000,  emoji: "⭐", description: "1,000 Papaya Points and counting" },
  { id: "papaya_5000",  name: "Math Champion",   threshold: 5000,  emoji: "🏆", description: "5,000 Papaya Points — you're on fire" },
  { id: "papaya_10000", name: "Legend",          threshold: 10000, emoji: "👑", description: "10,000 Papaya Points. Legendary." },
];

/** Returns milestones crossed when going from prevTotal to newTotal */
export function getCrossedMilestones(prevTotal: number, newTotal: number): Milestone[] {
  return MILESTONES.filter(m => prevTotal < m.threshold && newTotal >= m.threshold);
}

/**
 * Insert achievement into DB — returns true if newly awarded, false if already had it.
 * Uses ON CONFLICT DO NOTHING for idempotent awarding.
 */
export async function awardAchievement(userId: string, achievementId: string): Promise<boolean> {
  const rows = await sql`
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (${userId}, ${achievementId})
    ON CONFLICT (user_id, achievement_id) DO NOTHING
    RETURNING id
  `;
  return rows.length > 0;
}
