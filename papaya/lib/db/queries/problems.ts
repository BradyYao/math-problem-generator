import { sql } from "@/lib/db";

export interface ProblemChoice {
  id: string;
  label: string;
  latex: string;
}

export interface Problem {
  id: string;
  topic_id: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  answer_type: "mc" | "numeric" | "grid-in";
  stem_latex: string;
  choices: ProblemChoice[] | null;
  correct_answer: string;
  tolerance: number | null;
  hint_1: string | null;
  hint_2: string | null;
  hint_3: string | null;
  explanation: string | null;
  source: "library" | "ai-generated" | "ai-verified";
  quality_score: number;
  created_at: string;
}

/** Select problems for a session using the 70/20/10 difficulty mix */
export async function selectProblemsForSession(
  topicId: string,
  targetDifficulty: number,
  count: number,
  excludeIds: string[] = []
): Promise<Problem[]> {
  // Compute difficulty buckets: 70% at-level, 20% stretch (+1), 10% fluency (-1)
  const atLevel = Math.max(1, Math.min(5, targetDifficulty));
  const stretch = Math.min(5, atLevel + 1);
  const fluency = Math.max(1, atLevel - 1);

  const atCount = Math.round(count * 0.7);
  const stretchCount = Math.round(count * 0.2);
  const fluencyCount = count - atCount - stretchCount;

  const excluded = excludeIds.length > 0 ? excludeIds : ["00000000-0000-0000-0000-000000000000"];

  const rows = await sql`
    (
      SELECT *, 'at' as bucket FROM problems
      WHERE topic_id = ${topicId}
        AND difficulty = ${atLevel}
        AND quality_score > 0.4
        AND id != ALL(${excluded}::uuid[])
      ORDER BY random()
      LIMIT ${atCount}
    )
    UNION ALL
    (
      SELECT *, 'stretch' as bucket FROM problems
      WHERE topic_id = ${topicId}
        AND difficulty = ${stretch}
        AND quality_score > 0.4
        AND id != ALL(${excluded}::uuid[])
      ORDER BY random()
      LIMIT ${stretchCount}
    )
    UNION ALL
    (
      SELECT *, 'fluency' as bucket FROM problems
      WHERE topic_id = ${topicId}
        AND difficulty = ${fluency}
        AND quality_score > 0.4
        AND id != ALL(${excluded}::uuid[])
      ORDER BY random()
      LIMIT ${fluencyCount}
    )
  `;

  // Deduplicate (possible when difficulty buckets collapse, e.g. atLevel=fluency=1)
  // then shuffle the combined result
  const seen = new Set<string>();
  const unique = (rows as Problem[]).filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
  return unique.sort(() => Math.random() - 0.5);
}

export async function getProblemById(id: string): Promise<Problem | null> {
  const rows = await sql`SELECT * FROM problems WHERE id = ${id}`;
  return (rows[0] as Problem) ?? null;
}

export async function countAvailableProblems(
  topicId: string,
  difficulty: number,
  excludeIds: string[] = []
): Promise<number> {
  const excluded = excludeIds.length > 0 ? excludeIds : ["00000000-0000-0000-0000-000000000000"];
  const rows = await sql`
    SELECT COUNT(*)::int as count FROM problems
    WHERE topic_id = ${topicId}
      AND difficulty = ${difficulty}
      AND quality_score > 0.4
      AND id != ALL(${excluded}::uuid[])
  `;
  return (rows[0] as { count: number }).count;
}

export async function insertProblem(
  problem: Omit<Problem, "id" | "created_at">
): Promise<Problem> {
  const rows = await sql`
    INSERT INTO problems (
      topic_id, difficulty, answer_type, stem_latex, choices,
      correct_answer, tolerance, hint_1, hint_2, hint_3,
      explanation, source, quality_score
    ) VALUES (
      ${problem.topic_id}, ${problem.difficulty}, ${problem.answer_type},
      ${problem.stem_latex}, ${JSON.stringify(problem.choices)},
      ${problem.correct_answer}, ${problem.tolerance},
      ${problem.hint_1}, ${problem.hint_2}, ${problem.hint_3},
      ${problem.explanation}, ${problem.source}, ${problem.quality_score}
    )
    RETURNING *
  `;
  return rows[0] as Problem;
}

/**
 * Returns all problem IDs a user has already answered across all sessions.
 * Used to exclude previously-seen problems when building a new session queue.
 */
export async function getSeenProblemIds(userId: string): Promise<string[]> {
  const rows = await sql`
    SELECT DISTINCT sa.problem_id::text
    FROM session_answers sa
    JOIN sessions s ON s.id = sa.session_id
    WHERE s.user_id = ${userId}
  `;
  return rows.map((r) => (r as { problem_id: string }).problem_id);
}

export async function updateProblemHints(
  problemId: string,
  hints: { hint_1?: string; hint_2?: string; hint_3?: string }
): Promise<void> {
  await sql`
    UPDATE problems SET
      hint_1 = COALESCE(${hints.hint_1 ?? null}, hint_1),
      hint_2 = COALESCE(${hints.hint_2 ?? null}, hint_2),
      hint_3 = COALESCE(${hints.hint_3 ?? null}, hint_3)
    WHERE id = ${problemId}
  `;
}
