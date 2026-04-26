/**
 * Papaya Score formula per notes/scoring-spec.md
 *
 * Score = BasePoints + SpeedBonus + StreakBonus + HardBonus - HintPenalty
 */

// Par times in seconds for difficulty 1–5
export const PAR_TIMES: Record<number, number> = {
  1: 30,
  2: 45,
  3: 60,
  4: 90,
  5: 120,
};

const HINT_PENALTIES = [0, 0, 3, 6] as const;

export interface ProblemScoreParams {
  correct: boolean;
  difficulty: 1 | 2 | 3 | 4 | 5;
  timeSpentSeconds: number;
  hintsUsed: 0 | 1 | 2 | 3;
}

export interface ProblemScoreBreakdown {
  base: number;
  speed: number;
  hard: number;
  hint_penalty: number;
  total: number;
}

/** Score earned for a single problem */
export function scoreProblem(params: ProblemScoreParams): ProblemScoreBreakdown {
  if (!params.correct) {
    return { base: 0, speed: 0, hard: 0, hint_penalty: 0, total: 0 };
  }

  const base = 10;

  // Speed bonus: max +5, based on par time
  const parTime = PAR_TIMES[params.difficulty];
  const cappedTime = Math.min(params.timeSpentSeconds, parTime * 3);
  const speed = Math.max(
    0,
    Math.floor(((parTime - cappedTime) / parTime) * 5)
  );

  // Hard bonus: +3 for difficulty 4, +7 for difficulty 5
  const hard = params.difficulty === 5 ? 7 : params.difficulty === 4 ? 3 : 0;

  // Hint penalty
  const hint_penalty = HINT_PENALTIES[params.hintsUsed];

  const total = Math.max(0, base + speed + hard - hint_penalty);

  return { base, speed, hard, hint_penalty, total };
}

/** Streak bonus applied once per qualifying session */
export function streakBonus(currentStreakDays: number): number {
  return Math.min(currentStreakDays * 2, 30);
}

/** Total session Papaya Score */
export function sessionScore(
  problems: ProblemScoreParams[],
  streakDays: number
): number {
  const problemTotal = problems.reduce(
    (sum, p) => sum + scoreProblem(p).total,
    0
  );
  return problemTotal + streakBonus(streakDays);
}
