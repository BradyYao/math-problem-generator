/**
 * Bulk problem library seeding script.
 * By default seeds ALL leaf topics in the taxonomy (189 topics × 5 difficulties × 5 problems = ~4,725 problems).
 * Safe to re-run — skips topic+difficulty combos that already have enough problems in the DB.
 *
 * Usage:
 *   npx tsx scripts/generate-problems.ts
 *
 * Env vars:
 *   COUNT        - problems per topic per difficulty (default: 5)
 *   DIFFICULTY   - specific difficulty 1–5, or "all" (default: "all")
 *   ANSWER_TYPE  - "mc", "numeric", or "mixed" (default: "mixed")
 *   GRADE_BAND   - filter to one band: "k2", "3-5", "6-8", "9-12" (default: all)
 *   TOPIC_IDS    - comma-separated IDs to override topic list (default: all leaves)
 *   DRY_RUN      - "true" to preview without calling Claude
 */
import { config } from "dotenv";
import { join } from "path";
config({ path: join(process.cwd(), ".env.local") });

import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import katex from "katex";

// ─── Config ───────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const COUNT = parseInt(process.env.COUNT ?? "5");
const DRY_RUN = process.env.DRY_RUN === "true";
const DIFFICULTY_FILTER = process.env.DIFFICULTY ?? "all";
const ANSWER_TYPE_PREF = (process.env.ANSWER_TYPE ?? "mixed") as "mc" | "numeric" | "mixed";
const GRADE_BAND_FILTER = process.env.GRADE_BAND ?? null;

const DIFFICULTIES: Array<1 | 2 | 3 | 4 | 5> =
  DIFFICULTY_FILTER === "all"
    ? [1, 2, 3, 4, 5]
    : [parseInt(DIFFICULTY_FILTER) as 1 | 2 | 3 | 4 | 5];

// ─── Leaf topic discovery ──────────────────────────────────────────────────────

interface TaxonomyTopic {
  id: string;
  name: string;
  parent_id: string | null;
  grade_band: string;
  domain: string;
}

function getLeafTopics(): TaxonomyTopic[] {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), "content/topics/taxonomy.json"), "utf-8")
  ) as TaxonomyTopic[];
  const parentIds = new Set(raw.map(t => t.parent_id).filter(Boolean));
  let leaves = raw.filter(t => !parentIds.has(t.id));
  if (GRADE_BAND_FILTER) leaves = leaves.filter(t => t.grade_band === GRADE_BAND_FILTER);
  return leaves;
}

function resolveTopics(): TaxonomyTopic[] {
  const all = getLeafTopics();
  if (!process.env.TOPIC_IDS) return all;

  const ids = new Set(process.env.TOPIC_IDS.split(",").map(s => s.trim()));
  const allTopics = JSON.parse(
    readFileSync(join(process.cwd(), "content/topics/taxonomy.json"), "utf-8")
  ) as TaxonomyTopic[];
  return allTopics.filter(t => ids.has(t.id));
}

// ─── Setup ────────────────────────────────────────────────────────────────────

if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }
if (!ANTHROPIC_API_KEY && !DRY_RUN) { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }

const sql = neon(DATABASE_URL);
const ai = new Anthropic({ apiKey: ANTHROPIC_API_KEY ?? "dry-run" });

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

async function countExisting(topicId: string, difficulty: number): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS n FROM problems
    WHERE topic_id = ${topicId} AND difficulty = ${difficulty} AND quality_score > 0.4
  `;
  return (rows[0] as { n: number }).n;
}

async function generateOne(
  topic: TaxonomyTopic,
  difficulty: 1 | 2 | 3 | 4 | 5,
  variationSeed: number
): Promise<"ok" | "skip" | "error"> {
  const answerType = pickAnswerType(topic.grade_band, difficulty);

  const answerInstructions = answerType === "mc"
    ? `Provide exactly 4 answer choices (ids: "a","b","c","d"). Exactly one correct. Distractors must reflect common student errors.`
    : `Provide correct_answer as a number string. If the answer may be a decimal include a tolerance (e.g. 0.01); for exact integers tolerance is null. If solving for a named variable (e.g. "find x") set answer_label to "x ="; if asking for a counted noun set it to that noun; otherwise null.`;

  const userPrompt = `Generate a math problem with these properties:
- Topic: ${topic.name} (${topic.id})
- Grade band: ${topic.grade_band}
- Difficulty: ${difficulty}/5
- Answer type: ${answerType}

Requirements:
1. Problem must be original and appropriate for the grade band.
2. ${answerInstructions}
3. Write 3 progressive hints — hint_1 (Direction: high-level reframe only), hint_2 (First Step: first meaningful step), hint_3 (Almost There: penultimate step — never give the final answer).
4. Write a full worked explanation with every step shown.
5. All math: KaTeX syntax $...$ inline, $$...$$ display.
6. Set problem_format to "word_problem" if it has a real-world scenario, "equation" if primarily symbolic.

Return ONLY valid JSON, no markdown fences:
{"stem_latex":"...","choices":[{"id":"a","label":"A","latex":"..."},...]or null,"correct_answer":"...","tolerance":null,"answer_label":null,"problem_format":"equation","hint_1":"...","hint_2":"...","hint_3":"...","explanation":"...","difficulty":${difficulty}}`;

  const hashInput = `${userPrompt}__seed_${variationSeed}`;
  const promptHash = crypto.createHash("sha256").update(hashInput).digest("hex");

  const existing = await sql`
    SELECT problem_id FROM ai_generation_log
    WHERE prompt_hash = ${promptHash} AND created_at > now() - interval '7 days'
    LIMIT 1
  `;
  if (existing[0]) return "skip";

  if (DRY_RUN) return "ok";

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
    return "error";
  }

  for (const field of ["stem_latex", "hint_1", "hint_2", "hint_3", "explanation"] as const) {
    if (validateKaTeX(String(parsed[field] ?? ""))) return "error";
  }

  const [problem] = await sql`
    INSERT INTO problems (
      topic_id, difficulty, answer_type, stem_latex, choices,
      correct_answer, tolerance, answer_label, problem_format,
      hint_1, hint_2, hint_3, explanation, source, quality_score
    ) VALUES (
      ${topic.id}, ${difficulty}, ${answerType},
      ${String(parsed.stem_latex)},
      ${parsed.choices ? JSON.stringify(parsed.choices) : null},
      ${String(parsed.correct_answer)},
      ${(parsed.tolerance as number | null) ?? null},
      ${(parsed.answer_label as string | null) ?? null},
      ${(parsed.problem_format as string | null) ?? null},
      ${String(parsed.hint_1)}, ${String(parsed.hint_2)}, ${String(parsed.hint_3)},
      ${String(parsed.explanation)},
      'library', 0.7
    )
    RETURNING id
  `;

  await sql`
    INSERT INTO ai_generation_log (topic_id, prompt_hash, model, input_tokens, output_tokens, problem_id)
    VALUES (${topic.id}, ${promptHash}, 'claude-sonnet-4-6', ${response.usage.input_tokens}, ${response.usage.output_tokens}, ${problem.id})
  `;

  return "ok";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const topics = resolveTopics();

  console.log(`\nPapaya problem seeder`);
  console.log(`Topics: ${topics.length}  |  Difficulties: ${DIFFICULTIES.join(",")}  |  Count/slot: ${COUNT}`);
  console.log(`Estimated new problems: up to ${topics.length * DIFFICULTIES.length * COUNT}`);
  if (GRADE_BAND_FILTER) console.log(`Grade band filter: ${GRADE_BAND_FILTER}`);
  console.log(`Dry run: ${DRY_RUN}\n`);

  let totalGenerated = 0, totalSkipped = 0, totalErrors = 0;
  const startTime = Date.now();

  for (let ti = 0; ti < topics.length; ti++) {
    const topic = topics[ti];
    const prefix = `[${String(ti + 1).padStart(3)}/${topics.length}] ${topic.id}`;

    for (const difficulty of DIFFICULTIES) {
      const existing = await countExisting(topic.id, difficulty);
      const needed = Math.max(0, COUNT - existing);

      if (needed === 0) {
        process.stdout.write(`  ${prefix}  d${difficulty}: already has ${existing} — skip\n`);
        totalSkipped += COUNT;
        continue;
      }

      // Generate all needed problems for this topic+difficulty in parallel
      const results = await Promise.allSettled(
        Array.from({ length: needed }, (_, i) => generateOne(topic, difficulty, existing + i))
      );

      let gen = 0, skip = 0, err = 0;
      for (const r of results) {
        if (r.status === "rejected") { err++; }
        else if (r.value === "ok") { gen++; }
        else if (r.value === "skip") { skip++; }
        else { err++; }
      }

      totalGenerated += gen;
      totalSkipped += skip;
      totalErrors += err;

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      process.stdout.write(`  ${prefix}  d${difficulty}: +${gen} generated, ${skip} cached, ${err} errors  [${elapsed}s]\n`);

      // Brief pause between difficulty batches to respect rate limits
      await new Promise(r => setTimeout(r, 400));
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n✓ Done in ${elapsed}s`);
  console.log(`  Generated: ${totalGenerated}  |  Skipped: ${totalSkipped}  |  Errors: ${totalErrors}`);

  if (totalErrors > 0) {
    console.log(`\nTip: Re-run the script to retry failed slots — it skips already-completed ones.`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
