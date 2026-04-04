/**
 * Problem selection using the 70/20/10 difficulty mix.
 * Given a user's current mu for a topic, returns the difficulty
 * buckets to draw from.
 */
import { muToTargetDifficulty } from "./model";

export interface DifficultyBuckets {
  at_level: 1 | 2 | 3 | 4 | 5;   // 70%
  stretch: 1 | 2 | 3 | 4 | 5;    // 20%
  fluency: 1 | 2 | 3 | 4 | 5;    // 10%
}

export function getDifficultyBuckets(mu: number): DifficultyBuckets {
  const at_level = muToTargetDifficulty(mu);
  const stretch = Math.min(5, at_level + 1) as 1 | 2 | 3 | 4 | 5;
  const fluency = Math.max(1, at_level - 1) as 1 | 2 | 3 | 4 | 5;
  return { at_level, stretch, fluency };
}

/**
 * Given a desired session problem count, return how many to draw from each bucket.
 * When plateaued, shift to 60/30/10 (more stretch).
 */
export function getBucketCounts(
  count: number,
  plateaued = false
): { at: number; stretch: number; fluency: number } {
  if (plateaued) {
    const stretch = Math.round(count * 0.3);
    const fluency = Math.round(count * 0.1);
    return { at: count - stretch - fluency, stretch, fluency };
  }
  const stretch = Math.round(count * 0.2);
  const fluency = Math.round(count * 0.1);
  return { at: count - stretch - fluency, stretch, fluency };
}

/**
 * Estimate how many problems fit in a given time budget.
 * Uses historical avg time-per-problem or falls back to difficulty-based par times.
 */
export function estimateProblemCount(
  timeBudgetMinutes: number,
  avgSecondsPerProblem = 60,
  bufferFraction = 0.1
): number {
  const totalSeconds = timeBudgetMinutes * 60;
  const usableSeconds = totalSeconds * (1 - bufferFraction);
  return Math.max(1, Math.floor(usableSeconds / avgSecondsPerProblem));
}
