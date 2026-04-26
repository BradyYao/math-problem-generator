export type AnswerType = "mc" | "numeric" | "grid-in";
export type ProblemSource = "library" | "ai-generated" | "ai-verified";
export type GradeBand = "k2" | "3-5" | "6-8" | "9-12";
export type ProblemFormat = "word_problem" | "equation" | "diagram_based";

export interface ProblemChoice {
  id: string;      // 'a' | 'b' | 'c' | 'd'
  label: string;   // 'A' | 'B' | 'C' | 'D'
  latex: string;
}

export interface Problem {
  id: string;
  topic_id: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  answer_type: AnswerType;
  stem_latex: string;
  choices: ProblemChoice[] | null;
  correct_answer: string;
  tolerance: number | null;
  answer_label: string | null;
  problem_format: ProblemFormat | null;
  hint_1: string | null;
  hint_2: string | null;
  hint_3: string | null;
  explanation: string | null;
  source: ProblemSource;
  quality_score: number;
  created_at: string;
}

/** The shape Claude must return when generating a problem */
export interface GeneratedProblem {
  stem_latex: string;
  choices: ProblemChoice[] | null;
  correct_answer: string;
  tolerance: number | null;
  answer_label?: string | null;
  problem_format?: ProblemFormat | null;
  hint_1: string;
  hint_2: string;
  hint_3: string;
  explanation: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

/** Hint levels */
export type HintLevel = 1 | 2 | 3;

export interface HintResponse {
  level: HintLevel;
  text: string;
  is_last: boolean;
}
