"use client";

import { MathRenderer } from "./MathRenderer";
import type { ProblemChoice } from "@/types/problem";

interface AnswerInputMCProps {
  choices: ProblemChoice[];
  selected: string | null;
  disabled: boolean;
  correctAnswer?: string | null; // shown after submission
  onSelect: (id: string) => void;
}

export function AnswerInputMC({
  choices,
  selected,
  disabled,
  correctAnswer,
  onSelect,
}: AnswerInputMCProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {choices.map(choice => {
        const isSelected = selected === choice.id;
        const isCorrect = correctAnswer === choice.id;
        const isWrong = disabled && isSelected && correctAnswer != null && !isCorrect;
        const showCorrect = disabled && correctAnswer != null && isCorrect;

        let borderClass = "border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50";
        if (showCorrect) borderClass = "border-green-500 bg-green-50";
        else if (isWrong) borderClass = "border-red-400 bg-red-50";
        else if (isSelected) borderClass = "border-indigo-500 bg-indigo-50";

        return (
          <button
            key={choice.id}
            onClick={() => !disabled && onSelect(choice.id)}
            disabled={disabled}
            className={`
              flex items-start gap-3 w-full rounded-xl border-2 px-4 py-3 text-left transition-all
              ${borderClass}
              ${disabled ? "cursor-default" : "cursor-pointer active:scale-[0.99]"}
            `}
          >
            <span className={`
              flex-none w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold mt-0.5
              ${showCorrect ? "border-green-500 bg-green-500 text-white"
                : isWrong ? "border-red-400 bg-red-400 text-white"
                : isSelected ? "border-indigo-500 bg-indigo-500 text-white"
                : "border-gray-300 text-gray-500"}
            `}>
              {choice.id.toUpperCase()}
            </span>
            <MathRenderer latex={choice.latex} className="flex-1 text-gray-800 leading-relaxed" />
          </button>
        );
      })}
    </div>
  );
}
