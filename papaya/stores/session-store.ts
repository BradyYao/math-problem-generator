"use client";

import { create } from "zustand";
import type { Problem } from "@/types/problem";
import type { AnswerResponse, ScoreBreakdown } from "@/types/session";

export type PracticePhase =
  | "loading"
  | "answering"
  | "feedback"
  | "complete";

interface SessionStore {
  // Identity
  sessionId: string | null;
  mode: "practice" | "quickfire" | "assessment" | null;

  // Progress
  currentProblem: Problem | null;
  currentIndex: number;
  totalProblems: number;
  hintsUsed: number;
  papayaScore: number;

  // Timing
  timerStartedAt: number | null; // epoch ms
  timeBudgetMinutes: number;

  // UI state
  phase: PracticePhase;
  lastAnswer: {
    isCorrect: boolean;
    correctAnswer: string | null;
    explanation: string | null;
    skillDelta: number;
    scoreBreakdown: ScoreBreakdown;
  } | null;

  // Hint state
  revealedHints: Array<{ level: number; text: string }>;

  // Actions
  initSession: (params: {
    sessionId: string;
    mode: "practice" | "quickfire" | "assessment";
    problem: Problem;
    totalProblems: number;
    timeBudgetMinutes: number;
  }) => void;

  setPhase: (phase: PracticePhase) => void;
  incrementHintsUsed: () => void;
  addRevealedHint: (level: number, text: string) => void;
  clearHints: () => void;

  recordAnswer: (response: AnswerResponse) => void;
  advanceProblem: () => void;
  completeSession: () => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  mode: null,
  currentProblem: null,
  currentIndex: 0,
  totalProblems: 0,
  hintsUsed: 0,
  papayaScore: 0,
  timerStartedAt: null,
  timeBudgetMinutes: 20,
  phase: "loading" as PracticePhase,
  lastAnswer: null,
  revealedHints: [],
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialState,

  initSession({ sessionId, mode, problem, totalProblems, timeBudgetMinutes }) {
    set({
      sessionId,
      mode,
      currentProblem: problem,
      currentIndex: 0,
      totalProblems,
      timeBudgetMinutes,
      timerStartedAt: Date.now(),
      hintsUsed: 0,
      papayaScore: 0,
      phase: "answering",
      lastAnswer: null,
      revealedHints: [],
    });
  },

  setPhase(phase) {
    set({ phase });
  },

  incrementHintsUsed() {
    set(s => ({ hintsUsed: s.hintsUsed + 1 }));
  },

  addRevealedHint(level, text) {
    set(s => ({
      revealedHints: [...s.revealedHints, { level, text }],
    }));
  },

  clearHints() {
    set({ revealedHints: [], hintsUsed: 0 });
  },

  recordAnswer(response) {
    set(s => ({
      papayaScore: s.papayaScore + response.papaya_points_earned,
      lastAnswer: {
        isCorrect: response.is_correct,
        correctAnswer: response.correct_answer,
        explanation: response.explanation,
        skillDelta: response.skill_delta,
        scoreBreakdown: response.score_breakdown,
      },
      phase: "feedback",
    }));
  },

  advanceProblem() {
    const { lastAnswer } = get();
    if (!lastAnswer) return;

    // next_problem is set by the API response — handled by the page component
    set(s => ({
      currentIndex: s.currentIndex + 1,
      hintsUsed: 0,
      revealedHints: [],
      timerStartedAt: Date.now(),
      phase: "answering",
      lastAnswer: null,
    }));
  },

  completeSession() {
    set({ phase: "complete" });
  },

  reset() {
    set(initialState);
  },
}));
