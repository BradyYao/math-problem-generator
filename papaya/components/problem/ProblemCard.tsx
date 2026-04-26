"use client";

import { MathRenderer } from "@/components/math/MathRenderer";
import { AnswerInputMC } from "@/components/math/AnswerInputMC";
import { AnswerInputNumeric } from "@/components/math/AnswerInputNumeric";
import { HintPanel } from "@/components/math/HintPanel";
import type { Problem } from "@/types/problem";

const DIFFICULTY_LABELS = ["", "Easy", "Easy", "Medium", "Hard", "Expert"];
const DIFFICULTY_COLORS = [
  "",
  "text-green-600 bg-green-100",
  "text-green-600 bg-green-100",
  "text-yellow-700 bg-yellow-100",
  "text-orange-700 bg-orange-100",
  "text-red-700 bg-red-100",
];

interface ProblemCardProps {
  problem: Problem;
  sessionId: string;
  currentIndex: number;
  totalProblems: number;
  hintsUsed: number;
  selectedAnswer: string;
  submitted: boolean;
  correctAnswer?: string | null;
  onAnswerChange: (val: string) => void;
  onSubmit: () => void;
  onHintRevealed: (level: number) => void;
}

export function ProblemCard({
  problem,
  sessionId,
  currentIndex,
  totalProblems,
  hintsUsed,
  selectedAnswer,
  submitted,
  correctAnswer,
  onAnswerChange,
  onSubmit,
  onHintRevealed,
}: ProblemCardProps) {
  const isMC = problem.answer_type === "mc";

  return (
    <div className="flex flex-col gap-5 w-full max-w-2xl mx-auto">
      {/* Header row */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          Problem {currentIndex + 1} of {totalProblems}
        </span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_COLORS[problem.difficulty]}`}>
          {DIFFICULTY_LABELS[problem.difficulty]}
        </span>
      </div>

      {/* Problem stem */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <MathRenderer
          latex={problem.stem_latex}
          className="text-gray-900 text-base leading-relaxed"
        />
      </div>

      {/* Answer input */}
      {isMC && problem.choices ? (
        <AnswerInputMC
          choices={problem.choices}
          selected={selectedAnswer || null}
          disabled={submitted}
          correctAnswer={submitted ? (correctAnswer ?? null) : undefined}
          onSelect={onAnswerChange}
        />
      ) : (
        <AnswerInputNumeric
          value={selectedAnswer}
          disabled={submitted}
          correctAnswer={submitted ? (correctAnswer ?? null) : undefined}
          answerLabel={problem.answer_label}
          onChange={onAnswerChange}
          onSubmit={onSubmit}
        />
      )}

      {/* Submit button for MC */}
      {isMC && !submitted && selectedAnswer && (
        <button
          onClick={onSubmit}
          className="
            w-full rounded-xl bg-indigo-600 py-3.5 text-white font-semibold text-base
            hover:bg-indigo-700 active:scale-[0.98] transition-all
          "
        >
          Check Answer
        </button>
      )}

      {/* Hints */}
      {!submitted && (
        <HintPanel
          sessionId={sessionId}
          currentHintsUsed={hintsUsed}
          onHintRevealed={onHintRevealed}
        />
      )}
    </div>
  );
}
