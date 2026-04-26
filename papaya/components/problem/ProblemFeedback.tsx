"use client";

import { MathRenderer } from "@/components/math/MathRenderer";
import type { ScoreBreakdown } from "@/types/session";

interface ProblemFeedbackProps {
  isCorrect: boolean;
  correctAnswer: string | null;
  explanation: string | null;
  skillDelta: number;
  scoreBreakdown: ScoreBreakdown;
  sessionComplete: boolean;
  onNext: () => void;
}

export function ProblemFeedback({
  isCorrect,
  correctAnswer,
  explanation,
  skillDelta,
  scoreBreakdown,
  sessionComplete,
  onNext,
}: ProblemFeedbackProps) {
  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      {/* Result banner */}
      <div className={`
        rounded-2xl px-5 py-4 flex items-center gap-3
        ${isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}
      `}>
        <span className="text-2xl">{isCorrect ? "✓" : "✗"}</span>
        <div>
          <p className={`font-bold text-base ${isCorrect ? "text-green-700" : "text-red-700"}`}>
            {isCorrect ? "Correct!" : "Not quite"}
          </p>
          {!isCorrect && correctAnswer && (
            <p className="text-sm text-gray-600 mt-0.5">
              Answer: <span className="font-semibold">{correctAnswer}</span>
            </p>
          )}
        </div>

        {/* Score earned */}
        {scoreBreakdown.total > 0 && (
          <div className="ml-auto text-right">
            <p className="font-bold text-indigo-700 text-lg">+{scoreBreakdown.total}</p>
            <p className="text-xs text-gray-500">points</p>
          </div>
        )}
      </div>

      {/* Score breakdown (non-trivial cases) */}
      {isCorrect && (scoreBreakdown.speed > 0 || scoreBreakdown.hard > 0) && (
        <div className="flex gap-3 text-xs text-gray-500">
          <span>Base: +{scoreBreakdown.base}</span>
          {scoreBreakdown.speed > 0 && <span className="text-blue-600">Speed: +{scoreBreakdown.speed}</span>}
          {scoreBreakdown.hard > 0 && <span className="text-purple-600">Difficulty: +{scoreBreakdown.hard}</span>}
          {scoreBreakdown.hint_penalty < 0 && <span className="text-orange-600">Hints: {scoreBreakdown.hint_penalty}</span>}
        </div>
      )}

      {/* Skill delta */}
      <p className="text-xs text-gray-400">
        <span className={skillDelta > 0 ? "text-green-600 font-medium" : skillDelta < 0 ? "text-red-500 font-medium" : "text-gray-400"}>
          {skillDelta > 0 ? "↑ Skill growing" : skillDelta < 0 ? "Keep practicing — you'll get there" : "Skill steady"}
        </span>
      </p>

      {/* Explanation */}
      {explanation && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Explanation</p>
          <MathRenderer latex={explanation} className="text-gray-700 text-sm leading-relaxed" />
        </div>
      )}

      {/* Next button */}
      <button
        onClick={onNext}
        className="
          w-full rounded-xl bg-indigo-600 py-3.5 text-white font-semibold text-base
          hover:bg-indigo-700 active:scale-[0.98] transition-all mt-2
        "
      >
        {sessionComplete ? "See Results" : "Next Problem"}
      </button>
    </div>
  );
}
