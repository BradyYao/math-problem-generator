import { sql } from "@/lib/db";

export interface User {
  id: string;
  clerk_id: string | null;
  guest_token: string | null;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  grade_level: number | null;
  date_of_birth: string | null;
  is_minor: boolean;
  timezone: string;
  goal_type: string | null;
  goal_target_date: string | null;
  goal_score_target: number | null;
  created_at: string;
  last_active_at: string | null;
}

export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const rows = await sql`SELECT * FROM users WHERE clerk_id = ${clerkId}`;
  return (rows[0] as User) ?? null;
}

export async function getUserByGuestToken(token: string): Promise<User | null> {
  const rows = await sql`SELECT * FROM users WHERE guest_token = ${token}`;
  return (rows[0] as User) ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
  return (rows[0] as User) ?? null;
}

export async function createGuestUser(guestToken: string): Promise<User> {
  const rows = await sql`
    INSERT INTO users (guest_token)
    VALUES (${guestToken})
    RETURNING *
  `;
  return rows[0] as User;
}

export async function upgradeGuestToAccount(
  guestToken: string,
  clerkId: string,
  email: string | null,
  displayName: string | null
): Promise<User | null> {
  const rows = await sql`
    UPDATE users
    SET
      clerk_id = ${clerkId},
      email = ${email},
      display_name = COALESCE(display_name, ${displayName}),
      guest_token = NULL
    WHERE guest_token = ${guestToken}
    RETURNING *
  `;
  return (rows[0] as User) ?? null;
}

export async function updateUserLastActive(userId: string): Promise<void> {
  await sql`
    UPDATE users SET last_active_at = now() WHERE id = ${userId}
  `;
}

export async function updateUserProfile(
  userId: string,
  updates: {
    display_name?: string;
    grade_level?: number;
    timezone?: string;
    goal_type?: string;
    goal_target_date?: string;
    goal_score_target?: number;
  }
): Promise<User | null> {
  const rows = await sql`
    UPDATE users
    SET
      display_name = COALESCE(${updates.display_name ?? null}, display_name),
      grade_level = COALESCE(${updates.grade_level ?? null}, grade_level),
      timezone = COALESCE(${updates.timezone ?? null}, timezone),
      goal_type = COALESCE(${updates.goal_type ?? null}, goal_type),
      goal_target_date = COALESCE(${updates.goal_target_date ?? null}, goal_target_date),
      goal_score_target = COALESCE(${updates.goal_score_target ?? null}, goal_score_target)
    WHERE id = ${userId}
    RETURNING *
  `;
  return (rows[0] as User) ?? null;
}
