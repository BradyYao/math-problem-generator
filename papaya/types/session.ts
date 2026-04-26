import type { Problem } from "./problem";

export type SessionMode = "practice" | "quickfire" | "assessment" | "challenge";

export interface SessionState {
  problem_queue: string[];          // ordered problem IDs
  current_index: number;
  pending_skill_deltas: Array<{
    topic_id: string;
    mu_before: number;
    mu_after: number;
  }>;
  hints_this_problem: number;       // 0–3
  timer_started_at: string | null;  // ISO timestamp for current problem
  papaya_score_accumulator: number;
}

export interface Session {
  id: string;
  user_id: string;
  mode: SessionMode;
  topic_ids: string[];
  started_at: string;
  ended_at: string | null;
  time_budget_minutes: number | null;
  problems_delivered: number;
  problems_correct: number;
  state: SessionState;
  is_complete: boolean;
  challenge_id: string | null;
}

export interface SessionAnswer {
  id: string;
  session_id: string;
  problem_id: string;
  user_answer: string;
  is_correct: boolean;
  time_spent_seconds: number;
  hints_used: number;
  skill_mu_before: number | null;
  skill_mu_after: number | null;
  answered_at: string;
}

/** Response from POST /api/session/start */
export interface StartSessionResponse {
  session_id: string;
  problem: Problem;
  session_number: number;  // total sessions for this user
}

export interface ScoreBreakdown {
  base: number;
  speed: number;
  hard: number;
  hint_penalty: number;
  total: number;
}

export interface MilestoneEarned {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

/** Response from POST /api/session/[id]/answer */
export interface AnswerResponse {
  is_correct: boolean;
  correct_answer: string | null;
  explanation: string | null;
  skill_delta: number;             // change in mu (e.g. +0.12)
  papaya_points_earned: number;
  next_problem: Problem | null;    // null = session complete
  session_complete: boolean;
  score_breakdown: ScoreBreakdown;
  milestone_earned: MilestoneEarned | null;
}

/** Response from GET /api/session/[id]/summary */
export interface SessionSummary {
  session_id: string;
  problems_correct: number;
  problems_total: number;
  papaya_score: number;
  time_elapsed_seconds: number;
  topic_breakdown: Array<{
    topic_id: string;
    topic_name: string;
    correct: number;
    total: number;
    mu_before: number;
    mu_after: number;
  }>;
}
