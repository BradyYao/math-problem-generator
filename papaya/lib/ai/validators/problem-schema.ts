import { z } from "zod";

const ProblemChoiceSchema = z.object({
  id: z.enum(["a", "b", "c", "d"]),
  label: z.enum(["A", "B", "C", "D"]),
  latex: z.string().min(1),
});

export const GeneratedProblemSchema = z.object({
  stem_latex: z.string().min(10),
  choices: z.array(ProblemChoiceSchema).length(4).nullable(),
  correct_answer: z.string().min(1),
  tolerance: z.number().nullable(),
  answer_label: z.string().nullable().optional(),
  problem_format: z.enum(["word_problem", "equation", "diagram_based"]).optional(),
  hint_1: z.string().min(10),
  hint_2: z.string().min(10),
  hint_3: z.string().min(10),
  explanation: z.string().min(20),
  difficulty: z.union([
    z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
  ]),
});

export type GeneratedProblemInput = z.infer<typeof GeneratedProblemSchema>;

/** Validate and cross-check the generated problem for consistency */
export function validateGeneratedProblem(
  data: unknown,
  answerType: "mc" | "numeric" | "grid-in"
): { success: true; data: GeneratedProblemInput } | { success: false; error: string } {
  const result = GeneratedProblemSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: `Schema validation failed: ${result.error.issues.map(i => i.message).join(", ")}`,
    };
  }

  const parsed = result.data;

  // Cross-check: MC must have choices, numeric/grid-in must not
  if (answerType === "mc") {
    if (!parsed.choices || parsed.choices.length !== 4) {
      return { success: false, error: "MC problem must have exactly 4 choices" };
    }
    const validIds = ["a", "b", "c", "d"];
    if (!validIds.includes(parsed.correct_answer)) {
      return { success: false, error: `MC correct_answer must be a/b/c/d, got: ${parsed.correct_answer}` };
    }
  } else {
    if (parsed.choices !== null) {
      return { success: false, error: "Numeric/grid-in problem must have choices: null" };
    }
    if (isNaN(Number(parsed.correct_answer))) {
      return { success: false, error: `Numeric correct_answer must be a number, got: ${parsed.correct_answer}` };
    }
  }

  return { success: true, data: parsed };
}
