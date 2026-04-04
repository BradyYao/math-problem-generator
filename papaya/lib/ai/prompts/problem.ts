import type { AnswerType, GradeBand } from "@/types/problem";

export interface ProblemPromptParams {
  topicId: string;
  topicName: string;
  gradeBand: GradeBand;
  difficulty: 1 | 2 | 3 | 4 | 5;
  answerType: AnswerType;
  goalType?: string;
}

export function buildProblemPrompt(params: ProblemPromptParams): string {
  const { topicId, topicName, gradeBand, difficulty, answerType, goalType } = params;

  const answerInstructions = answerType === "mc"
    ? `Provide exactly 4 answer choices (ids: "a", "b", "c", "d"). Exactly one must be correct. Distractors must reflect common student errors — not random values.`
    : answerType === "numeric"
      ? `Provide the correct answer as a number string. If the answer may be expressed as a decimal, include a tolerance field (e.g. 0.01 for answers requiring 2 decimal precision). For exact integer or fraction answers, tolerance is null.`
      : `Provide the correct answer as a number string (SAT grid-in format — no fractions with denominators > 9, no mixed numbers, answers 0–9999). Tolerance null.`;

  return `Generate a math problem with the following properties:
- Topic: ${topicName} (${topicId})
- Grade band: ${gradeBand}
- Difficulty: ${difficulty}/5
- Answer type: ${answerType}
${goalType ? `- Student goal context: ${goalType}` : ""}

Requirements:
1. Problem statement must be original, unambiguous, and appropriate for the grade band.
2. ${answerInstructions}
3. Write THREE progressive hints:
   - hint_1 (Direction): High-level reframe. Ask "what is this really asking?" Do NOT reveal any steps or the method.
   - hint_2 (First Step): Describe or reveal the first meaningful step only. Do not go further.
   - hint_3 (Almost There): Give the penultimate step. Leave only the final computation. Do NOT give the final numerical answer.
4. Write a full worked explanation showing every single step. Use clear plain-language descriptions before each math line.
5. All math must use KaTeX syntax: $...$ for inline expressions, $$...$$ for display equations.
6. The problem must be solvable without a calculator unless the grade band is 9-12 and topic warrants it.

Return ONLY valid JSON matching this exact schema (no markdown, no explanation outside the JSON):
{
  "stem_latex": "string — the problem statement with KaTeX math",
  "choices": [{"id": "a", "label": "A", "latex": "string"}, {"id": "b", "label": "B", "latex": "string"}, {"id": "c", "label": "C", "latex": "string"}, {"id": "d", "label": "D", "latex": "string"}] or null,
  "correct_answer": "string — choice id for mc, number string for numeric/grid-in",
  "tolerance": number or null,
  "hint_1": "string",
  "hint_2": "string",
  "hint_3": "string",
  "explanation": "string — full worked solution with KaTeX",
  "difficulty": ${difficulty}
}`;
}

export function buildHintPrompt(params: {
  stemLatex: string;
  level: 1 | 2 | 3;
  gradeBand: GradeBand;
}): string {
  const levelDescriptions = {
    1: "hint_1 (Direction): High-level reframe only. Ask what the problem is really asking. Do NOT reveal any steps or the method.",
    2: "hint_2 (First Step): Describe or reveal the first meaningful step only. Do not go further.",
    3: "hint_3 (Almost There): Give the penultimate step, leaving only the final computation. Do NOT give the final numerical answer.",
  };

  return `Given this math problem:
${params.stemLatex}

Generate ${levelDescriptions[params.level]}

Return ONLY the hint text (no JSON, no label prefix). Use KaTeX for any math. Match the voice for grade band ${params.gradeBand}.`;
}
