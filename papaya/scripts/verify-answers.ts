/**
 * Answer verification script.
 * Fetches every problem from the DB, asks Claude to verify the answer,
 * and updates any that are wrong.
 *
 * Run: npx tsx scripts/verify-answers.ts
 * Dry run (no DB writes): DRY_RUN=true npx tsx scripts/verify-answers.ts
 */
import { config } from "dotenv";
import { join } from "path";
config({ path: join(process.cwd(), ".env.local") });

import { neon } from "@neondatabase/serverless";
import Anthropic from "@anthropic-ai/sdk";

const DATABASE_URL = process.env.DATABASE_URL!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const DRY_RUN = process.env.DRY_RUN === "true";
// Delay between Claude calls to avoid rate limits (ms)
const DELAY_MS = 400;

if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");
if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");

const sql = neon(DATABASE_URL);
const ai = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

interface Choice {
  id: string;   // "a" | "b" | "c" | "d"
  label: string;
  latex: string;
}

interface Problem {
  id: string;
  topic_id: string;
  difficulty: number;
  answer_type: string;
  stem_latex: string;
  choices: Choice[] | null;
  correct_answer: string;
  tolerance: number | null;
  explanation: string | null;
}

interface VerifyResult {
  is_correct: boolean;
  correct_answer: string;     // the verified answer
  correct_choice_id?: string; // only for MC
  reasoning: string;
}

function buildPrompt(problem: Problem): string {
  const choicesText = problem.choices
    ? problem.choices.map(c => `  ${c.id}) ${c.latex}`).join("\n")
    : null;

  const answerSection = problem.answer_type === "mc"
    ? `Answer choices:\n${choicesText}\n\nMarked correct answer: choice "${problem.correct_answer}"`
    : `Marked correct answer: ${problem.correct_answer}${problem.tolerance != null ? ` (tolerance ±${problem.tolerance})` : ""}`;

  return `You are a math answer verifier. Solve the following problem step by step, then verify whether the marked answer is correct.

Problem (LaTeX):
${problem.stem_latex}

Answer type: ${problem.answer_type}
${answerSection}

Instructions:
1. Solve the problem completely.
2. Determine the correct answer.
3. Check if the marked answer matches your solution.
4. For MC: identify the correct choice id ("a", "b", "c", or "d").
5. For numeric/grid-in: express the answer as a decimal or fraction (e.g. "5.5" or "11/2" — prefer decimal).

Return ONLY valid JSON, no markdown:
{
  "is_correct": true | false,
  "correct_answer": "<the verified answer — choice id for mc, number string for numeric>",
  "reasoning": "<brief explanation of your solution>"
}`;
}

async function verifyProblem(problem: Problem): Promise<VerifyResult> {
  const prompt = buildPrompt(problem);

  const response = await ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: "You are a precise math answer verifier. Return only valid JSON, no markdown fences.",
    messages: [{ role: "user", content: prompt }],
  });

  const fullText = response.content
    .filter(c => c.type === "text")
    .map(c => c.text)
    .join("");

  // Extract all JSON-looking blocks and take the last valid one
  // (Claude sometimes reconsiders mid-response, so the last block is most accurate)
  const jsonCandidates = [...fullText.matchAll(/\{[^{}]*\}/g)].map(m => m[0]);
  if (jsonCandidates.length === 0) {
    throw new Error(`No JSON found in response: ${fullText.slice(0, 200)}`);
  }

  let parsed: VerifyResult | null = null;
  // Try candidates from last to first, accept the first one that parses cleanly
  for (let i = jsonCandidates.length - 1; i >= 0; i--) {
    try {
      const candidate = JSON.parse(jsonCandidates[i]) as VerifyResult;
      if (typeof candidate.is_correct === "boolean" && typeof candidate.correct_answer === "string") {
        parsed = candidate;
        break;
      }
    } catch {
      // try the next one
    }
  }

  if (!parsed) {
    throw new Error(`No valid VerifyResult JSON found in response: ${fullText.slice(0, 200)}`);
  }

  return parsed;
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no DB writes)" : "LIVE"}\n`);

  const problems = await sql`
    SELECT id, topic_id, difficulty, answer_type, stem_latex, choices, correct_answer, tolerance, explanation
    FROM problems
    ORDER BY created_at ASC
  ` as Problem[];

  console.log(`Found ${problems.length} problems to verify.\n`);

  let verified = 0;
  let fixed = 0;
  let errors = 0;

  for (const problem of problems) {
    try {
      const result = await verifyProblem(problem);
      verified++;

      if (!result.is_correct) {
        console.log(`WRONG  [${problem.id}] topic=${problem.topic_id} d${problem.difficulty} type=${problem.answer_type}`);
        console.log(`       Stem: ${problem.stem_latex.slice(0, 120)}`);
        console.log(`       Was: "${problem.correct_answer}"  →  Should be: "${result.correct_answer}"`);
        console.log(`       Reason: ${result.reasoning}`);

        if (!DRY_RUN) {
          await sql`
            UPDATE problems
            SET correct_answer = ${result.correct_answer}
            WHERE id = ${problem.id}
          `;
          console.log(`       ✓ Updated in DB`);
        }

        fixed++;
        console.log();
      } else {
        process.stdout.write(".");
      }
    } catch (e) {
      errors++;
      console.error(`\nERROR  [${problem.id}]: ${(e as Error).message}`);
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n\n─────────────────────────────`);
  console.log(`Verified : ${verified}`);
  console.log(`Fixed    : ${fixed}${DRY_RUN ? " (dry run — no writes)" : ""}`);
  console.log(`Errors   : ${errors}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
