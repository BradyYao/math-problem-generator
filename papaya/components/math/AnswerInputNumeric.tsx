"use client";

import { useRef } from "react";

interface AnswerInputNumericProps {
  value: string;
  disabled: boolean;
  correctAnswer?: string | null;
  answerLabel?: string | null;
  onChange: (val: string) => void;
  onSubmit: () => void;
}

export function AnswerInputNumeric({
  value,
  disabled,
  correctAnswer,
  answerLabel,
  onChange,
  onSubmit,
}: AnswerInputNumericProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const showResult = disabled && correctAnswer !== undefined;
  const isCorrect = showResult && correctAnswer !== null &&
    Math.abs(parseFloat(value) - parseFloat(correctAnswer ?? "")) <= 0.001;

  let borderClass = "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200";
  if (showResult && isCorrect) borderClass = "border-green-500 bg-green-50";
  else if (showResult && !isCorrect) borderClass = "border-red-400 bg-red-50";

  const isPrefix = answerLabel?.includes("=") ?? false;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex gap-2 items-center">
        {isPrefix && answerLabel && (
          <span className="text-gray-700 font-semibold text-lg shrink-0">{answerLabel}</span>
        )}
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && value.trim()) onSubmit();
          }}
          placeholder="Your answer"
          className={`
            flex-1 rounded-xl border-2 px-4 py-3 text-lg text-gray-800
            outline-none transition-all focus:ring-2
            ${borderClass}
            ${disabled ? "cursor-default" : ""}
          `}
        />
        {!isPrefix && answerLabel && (
          <span className="text-gray-500 text-base shrink-0">{answerLabel}</span>
        )}
        {!disabled && (
          <button
            onClick={onSubmit}
            disabled={!value.trim()}
            className="
              shrink-0 rounded-xl bg-indigo-600 px-5 py-3 text-white font-semibold text-base
              hover:bg-indigo-700 active:scale-95 transition-all
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            Check
          </button>
        )}
      </div>

      {showResult && correctAnswer !== null && !isCorrect && (
        <p className="text-sm text-red-600">
          Correct answer: <span className="font-semibold">{correctAnswer}</span>
        </p>
      )}
    </div>
  );
}
