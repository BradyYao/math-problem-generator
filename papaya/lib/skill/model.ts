/**
 * Bayesian (Kalman-style) skill model per notes/scoring-spec.md
 *
 * Each (user, topic) pair has a skill estimate (mu, sigma).
 * mu  ∈ [0.01, 0.99] — estimated skill level
 * sigma ∈ [0.05, 0.45] — uncertainty
 */

export interface SkillEstimate {
  mu: number;
  sigma: number;
}

// Constants from scoring-spec.md
const NOISE_VARIANCE = 0.04;      // σ_obs² = 0.2²
const DIFFICULTY_SCALE = 0.5;     // amplifies update when difficulty ≠ skill
const HINT_MULTIPLIERS = [1.0, 0.7, 0.4, 0.2] as const;

// Clamp bounds
const MU_MIN = 0.01;
const MU_MAX = 0.99;
const SIGMA_MIN = 0.05;
const SIGMA_MAX = 0.45;

/** Map difficulty 1–5 → [0.1, 0.3, 0.5, 0.7, 0.9] */
export function difficultyToD(difficulty: 1 | 2 | 3 | 4 | 5): number {
  return (difficulty - 1) * 0.2 + 0.1;
}

/** Map mu [0,1] → target difficulty level 1–5 */
export function muToTargetDifficulty(mu: number): 1 | 2 | 3 | 4 | 5 {
  const raw = Math.round(mu * 4 + 1);
  return Math.max(1, Math.min(5, raw)) as 1 | 2 | 3 | 4 | 5;
}

/**
 * Compute updated skill estimate after one problem attempt.
 * Returns new (mu, sigma) and the delta.
 */
export function updateSkill(
  current: SkillEstimate,
  params: {
    difficulty: 1 | 2 | 3 | 4 | 5;
    correct: boolean;
    hintsUsed: 0 | 1 | 2 | 3;
  }
): SkillEstimate & { delta: number } {
  const { mu, sigma } = current;
  const d = difficultyToD(params.difficulty);

  // Kalman gain
  const sigmaSq = sigma * sigma;
  const K = sigmaSq / (sigmaSq + NOISE_VARIANCE);

  // Difficulty weighting — larger update when problem difficulty ≠ skill
  const difficultyFactor = 1 + DIFFICULTY_SCALE * Math.abs(d - mu);
  const K_adjusted = Math.min(K * difficultyFactor, 0.95); // cap to prevent overshoot

  // Hint penalty multiplier
  const hintFactor = HINT_MULTIPLIERS[params.hintsUsed];

  // Direction: toward 1 if correct, toward 0 if incorrect
  const observation = params.correct ? 1 : 0;
  const updateDirection = (observation - mu) * hintFactor;

  const mu_new = Math.max(MU_MIN, Math.min(MU_MAX, mu + K_adjusted * updateDirection));
  const sigma_new = Math.max(
    SIGMA_MIN,
    Math.min(SIGMA_MAX, Math.sqrt((1 - K_adjusted) * sigmaSq))
  );

  return {
    mu: Math.round(mu_new * 10000) / 10000,
    sigma: Math.round(sigma_new * 10000) / 10000,
    delta: Math.round((mu_new - mu) * 10000) / 10000,
  };
}

/**
 * Seed mu from placement assessment result.
 * Maps placement band to initial mu.
 */
export function placementToMu(
  band: "all_wrong" | "mostly_wrong" | "mixed" | "mostly_right" | "all_right"
): number {
  const map: Record<string, number> = {
    all_wrong: 0.15,
    mostly_wrong: 0.30,
    mixed: 0.50,
    mostly_right: 0.70,
    all_right: 0.85,
  };
  return map[band] ?? 0.50;
}

/**
 * Determine if a topic is mastered.
 * Requires: mu ≥ 0.85, sigma ≤ 0.15, attempts ≥ 10
 */
export function isMastered(skill: SkillEstimate & { attempts: number }): boolean {
  return skill.mu >= 0.85 && skill.sigma <= 0.15 && skill.attempts >= 10;
}

/**
 * Detect plateau: mu changed < 0.03 total over last N sessions on this topic.
 * Caller provides ordered mu snapshots.
 */
export function isPlateaued(muHistory: number[], minSessions = 10): boolean {
  if (muHistory.length < minSessions) return false;
  const recent = muHistory.slice(-minSessions);
  const change = Math.abs(recent[recent.length - 1] - recent[0]);
  return change < 0.03;
}
