/**
 * Streak logic per notes/scoring-spec.md
 *
 * A day "counts" if the user completes ≥ 3 problems in a qualifying session
 * within their local calendar day.
 */
import { differenceInCalendarDays, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export interface StreakState {
  current_streak: number;
  longest_streak: number;
  last_practice_date: string | null; // 'YYYY-MM-DD'
}

function todayInTimezone(timezone: string): string {
  const now = new Date();
  const zoned = toZonedTime(now, timezone);
  return zoned.toISOString().split("T")[0];
}

/**
 * Update streak after a qualifying session.
 * Returns new streak state.
 */
export function updateStreak(
  state: StreakState,
  timezone = "America/New_York"
): StreakState {
  const today = todayInTimezone(timezone);

  // Already counted today
  if (state.last_practice_date === today) {
    return state;
  }

  let newStreak: number;

  if (!state.last_practice_date) {
    newStreak = 1;
  } else {
    const last = parseISO(state.last_practice_date);
    const todayDate = parseISO(today);
    const diff = differenceInCalendarDays(todayDate, last);

    if (diff === 1) {
      // Consecutive day — extend streak
      newStreak = state.current_streak + 1;
    } else {
      // Gap — reset
      newStreak = 1;
    }
  }

  return {
    current_streak: newStreak,
    longest_streak: Math.max(newStreak, state.longest_streak),
    last_practice_date: today,
  };
}
