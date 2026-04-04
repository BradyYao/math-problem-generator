import { sql } from "@/lib/db";

export interface Topic {
  id: string;
  name: string;
  parent_id: string | null;
  grade_band: "k2" | "3-5" | "6-8" | "9-12";
  domain: string;
  sat_relevant: boolean;
  act_relevant: boolean;
  amc_relevant: boolean;
  sort_order: number;
}

export async function getTopicById(id: string): Promise<Topic | null> {
  const rows = await sql`SELECT * FROM topics WHERE id = ${id}`;
  return (rows[0] as Topic) ?? null;
}

export async function getTopicsByGradeBand(gradeBand: string): Promise<Topic[]> {
  return sql`
    SELECT * FROM topics
    WHERE grade_band = ${gradeBand}
    ORDER BY sort_order
  ` as unknown as Promise<Topic[]>;
}

export async function getTopicsByDomain(domain: string): Promise<Topic[]> {
  return sql`
    SELECT * FROM topics
    WHERE domain = ${domain}
    ORDER BY sort_order
  ` as unknown as Promise<Topic[]>;
}

export async function getLeafTopics(): Promise<Topic[]> {
  return sql`
    SELECT t.*
    FROM topics t
    WHERE NOT EXISTS (
      SELECT 1 FROM topics child WHERE child.parent_id = t.id
    )
    ORDER BY t.sort_order
  ` as unknown as Promise<Topic[]>;
}

export async function getChildTopics(parentId: string): Promise<Topic[]> {
  return sql`
    SELECT * FROM topics
    WHERE parent_id = ${parentId}
    ORDER BY sort_order
  ` as unknown as Promise<Topic[]>;
}

export async function getSATTopics(): Promise<Topic[]> {
  return sql`
    SELECT * FROM topics
    WHERE sat_relevant = true
    AND NOT EXISTS (SELECT 1 FROM topics child WHERE child.parent_id = topics.id)
    ORDER BY sort_order
  ` as unknown as Promise<Topic[]>;
}

export async function getAMCTopics(): Promise<Topic[]> {
  return sql`
    SELECT * FROM topics
    WHERE amc_relevant = true
    AND NOT EXISTS (SELECT 1 FROM topics child WHERE child.parent_id = topics.id)
    ORDER BY sort_order
  ` as unknown as Promise<Topic[]>;
}
