import type { GradeBand } from "@/types/problem";

export interface TutoringPromptParams {
  problem: string;
  gradeBand?: GradeBand;
}

export function buildTutoringSystemPrompt(): string {
  return `You are a patient, encouraging math tutor for K-12 students. \
Your role is to walk through problems step by step, explaining the WHY \
behind each step — not just the mechanics. Never skip steps that a student \
might find confusing. Use an upbeat, supportive tone appropriate for school-age learners. \
Use KaTeX syntax for all math: $...$ for inline expressions, $$...$$ for display equations.`;
}

export function buildTutoringPrompt(params: TutoringPromptParams): string {
  const { problem, gradeBand } = params;
  const levelHint = gradeBand
    ? `The student is in grade band: ${gradeBand}. Calibrate your language and depth accordingly.`
    : "";

  return `A student needs help with this homework problem:

---
${problem}
---

${levelHint}

Please:
1. Identify what mathematical concept this problem involves.
2. Walk through the complete solution step by step.
3. Before each calculation, explain in plain English what you are about to do and why.
4. Clearly state the final answer at the end.

Return ONLY valid JSON (no markdown, no text outside the JSON):
{
  "topic": "short name of the math concept, e.g. 'Linear Equations' or 'Fraction Division'",
  "guidance": "your full step-by-step walkthrough with KaTeX math"
}`;
}
