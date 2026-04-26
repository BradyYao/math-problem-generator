/**
 * Hybrid problem generation pipeline per architecture plan:
 *
 * Tier 1 — Pre-generated library (80%): fast, zero latency
 * Tier 2 — On-demand AI generation (15%): when library has < 3 unseen problems
 * Tier 3 — Assessment & special (5%): always fresh from Claude
 *
 * This module handles Tier 2 + 3.
 */
import crypto from "crypto";
import { getAI, MODELS } from "./client";
import { buildSystemPrompt } from "./prompts/system-tones";
import { buildProblemPrompt, buildHintPrompt } from "./prompts/problem";
import { validateGeneratedProblem } from "./validators/problem-schema";
import { validateProblemKaTeX } from "./validators/katex-validator";
import { insertProblem } from "@/lib/db/queries/problems";
import { sql } from "@/lib/db";
import type { GradeBand, AnswerType, GeneratedProblem } from "@/types/problem";
import type { Problem } from "@/types/problem";

const LIBRARY_THRESHOLD = 3; // min unseen problems before AI kicks in

export interface GenerateOptions {
  topicId: string;
  topicName: string;
  gradeBand: GradeBand;
  difficulty: 1 | 2 | 3 | 4 | 5;
  answerType?: AnswerType;
  goalType?: string;
  userId?: string;
  forceNew?: boolean; // always generate fresh (Tier 3)
  variationSeed?: number; // unique per slot in batch generation — makes each job's cache key distinct
  preferWordProblem?: boolean; // request a real-world scenario problem from Claude
  standardCode?: string;       // curriculum standard to align the problem to (e.g. "6.EE.A.1")
}

/**
 * Main entry point: returns a problem, generating via Claude if needed.
 * Caller provides excludeIds (already-seen problems this session).
 */
export async function getOrGenerateProblem(
  options: GenerateOptions,
  excludeIds: string[] = []
): Promise<Problem> {
  // Tier 1: try library first (unless forceNew)
  if (!options.forceNew) {
    const libraryProblem = await selectFromLibrary(
      options.topicId,
      options.difficulty,
      excludeIds
    );
    if (libraryProblem) return libraryProblem as unknown as Problem;
  }

  // Tier 2/3: generate with Claude
  return generateWithClaude(options);
}

async function selectFromLibrary(
  topicId: string,
  difficulty: number,
  excludeIds: string[]
): Promise<unknown | null> {
  const excluded = excludeIds.length > 0
    ? excludeIds
    : ["00000000-0000-0000-0000-000000000000"];

  const rows = await sql`
    SELECT * FROM problems
    WHERE topic_id = ${topicId}
      AND difficulty = ${difficulty}
      AND quality_score > 0.4
      AND id != ALL(${excluded}::uuid[])
    ORDER BY random()
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function generateWithClaude(options: GenerateOptions): Promise<Problem> {
  const answerType = options.answerType ?? pickAnswerType(options.gradeBand);
  const systemPrompt = buildSystemPrompt(
    options.gradeBand,
    "Generate a math problem as described below."
  );
  const userPrompt = buildProblemPrompt({
    topicId: options.topicId,
    topicName: options.topicName,
    gradeBand: options.gradeBand,
    difficulty: options.difficulty,
    answerType,
    goalType: options.goalType,
    preferWordProblem: options.preferWordProblem,
    standardCode: options.standardCode,
  });

  // Include variationSeed in the hash so batch jobs each get a distinct cache key,
  // but don't send it to Claude — the actual prompt stays the same.
  const hashInput = options.variationSeed != null
    ? `${userPrompt}__seed_${options.variationSeed}`
    : userPrompt;
  const promptHash = crypto
    .createHash("sha256")
    .update(hashInput)
    .digest("hex");

  // Check dedup: same prompt within 7 days → reuse
  const existing = await sql`
    SELECT p.* FROM ai_generation_log l
    JOIN problems p ON p.id = l.problem_id
    WHERE l.prompt_hash = ${promptHash}
      AND l.created_at > now() - interval '7 days'
    LIMIT 1
  `;
  if (existing[0]) return existing[0] as unknown as Problem;

  // Call Claude
  const ai = getAI();
  const response = await ai.messages.create({
    model: MODELS.generation,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const rawText = response.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");

  // Parse JSON
  let parsed: unknown;
  try {
    // Strip markdown code fences if present
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${rawText.slice(0, 200)}`);
  }

  // Validate schema
  const validation = validateGeneratedProblem(parsed, answerType);
  if (!validation.success) {
    throw new Error(`Problem schema invalid: ${validation.error}`);
  }

  // Validate KaTeX — soft-fail only; client renderer handles edge cases differently
  const katexError = validateProblemKaTeX(validation.data);
  if (katexError) {
    console.warn("[problem-generator] KaTeX warning (continuing):", katexError);
  }

  // Store problem
  const problem = await insertProblem({
    topic_id: options.topicId,
    difficulty: validation.data.difficulty,
    answer_type: answerType,
    stem_latex: validation.data.stem_latex,
    choices: validation.data.choices,
    correct_answer: validation.data.correct_answer,
    tolerance: validation.data.tolerance,
    answer_label: validation.data.answer_label ?? null,
    problem_format: validation.data.problem_format ?? null,
    hint_1: validation.data.hint_1,
    hint_2: validation.data.hint_2,
    hint_3: validation.data.hint_3,
    explanation: validation.data.explanation,
    source: "ai-generated",
    quality_score: 0.6,
  });

  // Log generation
  await sql`
    INSERT INTO ai_generation_log (user_id, topic_id, prompt_hash, model, input_tokens, output_tokens, problem_id)
    VALUES (
      ${options.userId ?? null},
      ${options.topicId},
      ${promptHash},
      ${MODELS.generation},
      ${response.usage.input_tokens},
      ${response.usage.output_tokens},
      ${problem.id}
    )
  `;

  return problem;
}

/** Generate a hint on-demand for a problem that's missing one */
export async function generateHint(params: {
  problemId: string;
  stemLatex: string;
  level: 1 | 2 | 3;
  gradeBand: GradeBand;
}): Promise<string> {
  const systemPrompt = buildSystemPrompt(
    params.gradeBand,
    `Generate hint level ${params.level} for the math problem below.`
  );
  const userPrompt = buildHintPrompt({
    stemLatex: params.stemLatex,
    level: params.level,
    gradeBand: params.gradeBand,
  });

  const ai = getAI();
  const response = await ai.messages.create({
    model: MODELS.fast,
    max_tokens: 256,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const hintText = response.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();

  // Cache the hint back on the problem row
  await sql`
    UPDATE problems SET
      hint_1 = CASE WHEN ${params.level} = 1 AND hint_1 IS NULL THEN ${hintText} ELSE hint_1 END,
      hint_2 = CASE WHEN ${params.level} = 2 AND hint_2 IS NULL THEN ${hintText} ELSE hint_2 END,
      hint_3 = CASE WHEN ${params.level} = 3 AND hint_3 IS NULL THEN ${hintText} ELSE hint_3 END
    WHERE id = ${params.problemId}
  `;

  return hintText;
}

/** Pick a reasonable answer type based on grade band */
function pickAnswerType(gradeBand: GradeBand): AnswerType {
  if (gradeBand === "k2" || gradeBand === "3-5") return "mc";
  // Mix for middle/high school
  return Math.random() < 0.6 ? "mc" : "numeric";
}
