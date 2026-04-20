/**
 * Batch problem library seeding script.
 * Generates problems for high-priority topics using the Claude API.
 *
 * Run: DATABASE_URL=... ANTHROPIC_API_KEY=... npx tsx scripts/generate-problems.ts
 *
 * Options (env vars):
 *   TOPIC_IDS   - comma-separated topic IDs (defaults to SAT + AMC priority list)
 *   COUNT       - problems per topic per difficulty (default: 10)
 *   DIFFICULTY  - specific difficulty 1-5, or "all" (default: "all")
 *   ANSWER_TYPE - "mc", "numeric", or "mixed" (default: "mixed")
 *   DRY_RUN     - "true" to log prompts without calling Claude
 */
import { config } from "dotenv";
import { join } from "path";
config({ path: join(process.cwd(), ".env.local") });

import { neon } from "@neondatabase/serverless";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import katex from "katex";

// ─── Config ──────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const COUNT = parseInt(process.env.COUNT ?? "20");
const DRY_RUN = process.env.DRY_RUN === "true";
const DIFFICULTY_FILTER = process.env.DIFFICULTY ?? "all";
const ANSWER_TYPE_PREF = (process.env.ANSWER_TYPE ?? "mixed") as "mc" | "numeric" | "mixed";

// Priority topics for initial seeding (SAT + AMC core)
const DEFAULT_TOPIC_IDS = [
  "algebra.alg1.linear-equations",
  "algebra.alg1.inequalities",
  "algebra.alg1.linear-systems",
  "algebra.alg1.word-problems",
  "algebra.alg1.slope",
  "algebra.alg2.factoring",
  "algebra.alg2.quadratic-equations",
  "algebra.alg2.quadratic-formula",
  "functions.linear.slope-intercept",
  "functions.quadratic.vertex-form",
  "functions.quadratic.graphing",
  "geometry.triangles.pythagorean",
  "geometry.triangles.special",
  "geometry.area.circles",
  "geometry.area.area-triangles",
  "geometry.area.composite",
  "geometry.coordinate.distance",
  "number.ratios.percent",
  "number.ratios.proportions",
  "number.fractions.multiply-divide",
  "number.integers.add-subtract",
  "measurement.data.mean-median-mode",
  "competition.number-theory.modular-arithmetic",
  "competition.combinatorics.combinations",
  "competition.number-theory.prime-factorization",
];

const TOPIC_IDS = process.env.TOPIC_IDS
  ? process.env.TOPIC_IDS.split(",").map(s => s.trim())
  : DEFAULT_TOPIC_IDS;

const DIFFICULTIES: Array<1 | 2 | 3 | 4 | 5> =
  DIFFICULTY_FILTER === "all"
    ? [1, 2, 3, 4, 5]
    : [parseInt(DIFFICULTY_FILTER) as 1 | 2 | 3 | 4 | 5];

// ─── Setup ───────────────────────────────────────────────────────────────────

const sql = neon(DATABASE_URL);
const ai = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickAnswerType(gradeBand: string, difficulty: number): "mc" | "numeric" {
  if (ANSWER_TYPE_PREF !== "mixed") return ANSWER_TYPE_PREF;
  if (gradeBand === "k2" || gradeBand === "3-5") return "mc";
  return difficulty >= 3 ? "numeric" : "mc";
}

function validateKaTeX(text: string): string | null {
  for (const match of text.matchAll(/\$\$([\s\S]+?)\$\$/g)) {
    try { katex.renderToString(match[1], { throwOnError: true }); }
    catch (e) { return `$$${match[1]}$$: ${(e as Error).message}`; }
  }
  for (const match of text.matchAll(/(?<!\$)\$(?!\$)([^$]+?)\$(?!\$)/g)) {
    try { katex.renderToString(match[1], { throwOnError: true }); }
    catch (e) { return `$${match[1]}$: ${(e as Error).message}`; }
  }
  return null;
}

async function generateOne(topic: { id: string; name: string; grade_band: string }, difficulty: 1 | 2 | 3 | 4 | 5, variationSeed: number) {
  const answerType = pickAnswerType(topic.grade_band, difficulty);

  const answerInstructions = answerType === "mc"
    ? `Provide exactly 4 answer choices (ids: "a","b","c","d"). Exactly one correct. Distractors = common errors.`
    : `Provide correct_answer as a number string. tolerance: null for exact answers, or a small decimal.`;

  const userPrompt = `Generate a math problem:
- Topic: ${topic.name} (${topic.id})
- Grade band: ${topic.grade_band}
- Difficulty: ${difficulty}/5
- Answer type: ${answerType}

${answerInstructions}
Write 3 progressive hints (Direction / First Step / Almost There — never give the final answer in a hint).
Write a full worked explanation with every step.
All math: KaTeX syntax $...$ inline, $$...$$ display.

Return ONLY valid JSON:
{"stem_latex":"...","choices":[...]or null,"correct_answer":"...","tolerance":null,"hint_1":"...","hint_2":"...","hint_3":"...","explanation":"...","difficulty":${difficulty}}`;

  // Include variationSeed in the hash so each slot in a COUNT run has a unique cache key,
  // but don't send it to Claude — the actual prompt stays the same.
  const hashInput = `${userPrompt}__seed_${variationSeed}`;
  const promptHash = crypto.createHash("sha256").update(hashInput).digest("hex");

  // Dedup check
  const existing = await sql`
    SELECT problem_id FROM ai_generation_log
    WHERE prompt_hash = ${promptHash}
      AND created_at > now() - interval '7 days'
    LIMIT 1
  `;
  if (existing[0]) {
    console.log(`  SKIP (cached) ${topic.id} d${difficulty}`);
    return;
  }

  if (DRY_RUN) {
    console.log(`  DRY_RUN: would generate ${topic.id} d${difficulty} (${answerType})`);
    return;
  }

  const response = await ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: "You are a math problem author. Return only valid JSON, no markdown fences.",
    messages: [{ role: "user", content: userPrompt }],
  });

  const rawText = response.content
    .filter(c => c.type === "text").map(c => c.text).join("")
    .replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error(`  ERROR: invalid JSON for ${topic.id} d${difficulty}`);
    return;
  }

  // KaTeX validation
  for (const field of ["stem_latex", "hint_1", "hint_2", "hint_3", "explanation"] as const) {
    const err = validateKaTeX(String(parsed[field] ?? ""));
    if (err) {
      console.error(`  ERROR: KaTeX invalid in ${field}: ${err}`);
      return;
    }
  }

  // Insert problem
  const [problem] = await sql`
    INSERT INTO problems (topic_id, difficulty, answer_type, stem_latex, choices, correct_answer, tolerance, hint_1, hint_2, hint_3, explanation, source, quality_score)
    VALUES (
      ${topic.id}, ${difficulty}, ${answerType},
      ${String(parsed.stem_latex)},
      ${parsed.choices ? JSON.stringify(parsed.choices) : null},
      ${String(parsed.correct_answer)},
      ${parsed.tolerance as number | null},
      ${String(parsed.hint_1)}, ${String(parsed.hint_2)}, ${String(parsed.hint_3)},
      ${String(parsed.explanation)},
      'ai-generated', 0.6
    )
    RETURNING id
  `;

  await sql`
    INSERT INTO ai_generation_log (topic_id, prompt_hash, model, input_tokens, output_tokens, problem_id)
    VALUES (${topic.id}, ${promptHash}, 'claude-sonnet-4-6', ${response.usage.input_tokens}, ${response.usage.output_tokens}, ${problem.id})
  `;

  console.log(`  OK: ${topic.id} d${difficulty} (${answerType}) → ${problem.id}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Generating problems for ${TOPIC_IDS.length} topics × ${DIFFICULTIES.length} difficulties × ${COUNT} each`);
  console.log(`Dry run: ${DRY_RUN}\n`);

  // Fetch topic metadata
  const topics = await sql`
    SELECT id, name, grade_band FROM topics WHERE id = ANY(${TOPIC_IDS}::text[])
  ` as Array<{ id: string; name: string; grade_band: string }>;

  const topicMap = new Map(topics.map(t => [t.id, t]));
  const missing = TOPIC_IDS.filter(id => !topicMap.has(id));
  if (missing.length > 0) {
    console.warn(`WARNING: Topics not found in DB (run seed-topics first): ${missing.join(", ")}`);
  }

  let total = 0, errors = 0;

  for (const topicId of TOPIC_IDS) {
    const topic = topicMap.get(topicId);
    if (!topic) continue;

    console.log(`\n[${topicId}]`);

    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < COUNT; i++) {
        try {
          await generateOne(topic, difficulty, i);
          total++;
        } catch (e) {
          console.error(`  ERROR: ${(e as Error).message}`);
          errors++;
        }
        // Rate limiting: small delay between calls
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }

  console.log(`\nDone. Generated: ${total}, Errors: ${errors}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
