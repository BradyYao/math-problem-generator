"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GOALS = [
  { id: "sat", label: "SAT prep", icon: "📝" },
  { id: "act", label: "ACT prep", icon: "📋" },
  { id: "amc", label: "AMC / competition", icon: "🏅" },
  { id: "school", label: "School / homework help", icon: "🏫" },
  { id: "casual", label: "Just practice", icon: "🎯" },
];

const GRADE_BANDS = [
  { id: "k2", label: "K–2", sub: "Ages 5–8" },
  { id: "3-5", label: "3–5", sub: "Ages 8–11" },
  { id: "6-8", label: "6–8", sub: "Ages 11–14" },
  { id: "9-12", label: "9–12", sub: "Ages 14–18" },
];

const TIME_OPTIONS = [
  { id: 5, label: "5 min", sub: "Quick hit" },
  { id: 10, label: "10 min", sub: "Short session" },
  { id: 20, label: "20 min", sub: "Solid practice" },
  { id: 30, label: "30 min", sub: "Deep work" },
];

// Sensible default topics per grade band
const DEFAULT_TOPICS: Record<string, string[]> = {
  "k2":  ["number.arithmetic.addition-subtraction", "number.counting.compare-numbers"],
  "3-5": ["number.fractions.add-subtract", "number.arithmetic.multiplication"],
  "6-8": ["algebra.alg1.linear-equations", "number.ratios.percent"],
  "9-12": ["algebra.alg2.quadratic-equations", "algebra.alg1.linear-systems"],
};

// Goals that skip grade selection and go straight to time
const EXAM_TOPICS: Record<string, string[]> = {
  sat: ["algebra.alg1.linear-equations", "algebra.alg2.quadratic-equations", "number.ratios.percent", "geometry.area.circles"],
  act: ["algebra.alg1.linear-equations", "algebra.alg2.quadratic-equations", "number.ratios.percent", "geometry.triangles.pythagorean"],
};

type Step = "goal" | "grade" | "time";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("goal");
  const [goal, setGoal] = useState<string | null>(null);
  const [grade, setGrade] = useState<string | null>(null);

  function handleGoalSelect(id: string) {
    setGoal(id);
    // SAT/ACT don't need grade selection — skip straight to time
    setStep(id in EXAM_TOPICS ? "time" : "grade");
  }

  function handleGradeSelect(id: string) {
    setGrade(id);
    setStep("time");
  }

  function handleTimeSelect(minutes: number) {
    if (!grade && !(goal && goal in EXAM_TOPICS)) return;

    const topicIds = (goal ? EXAM_TOPICS[goal] : null) ?? DEFAULT_TOPICS[grade ?? "6-8"] ?? DEFAULT_TOPICS["6-8"];
    const params = new URLSearchParams({
      topics: topicIds.join(","),
      time: String(minutes),
      mode: "practice",
    });
    router.push(`/practice/new?${params.toString()}`);
  }

  const steps: Step[] = ["goal", "grade", "time"];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      {/* Progress dots */}
      <div className="flex gap-2 mb-10">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all ${
              i <= stepIndex ? "w-6 bg-indigo-600" : "w-2 bg-zinc-200"
            }`}
          />
        ))}
      </div>

      {step === "goal" && (
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-zinc-900 text-center mb-2">
            What&apos;s your goal?
          </h1>
          <p className="text-zinc-500 text-center mb-8">
            We&apos;ll tailor your problems to what matters most to you.
          </p>
          <div className="flex flex-col gap-3">
            {GOALS.map((g) => (
              <button
                key={g.id}
                onClick={() => handleGoalSelect(g.id)}
                className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                <span className="text-2xl">{g.icon}</span>
                <span className="font-medium text-zinc-900">{g.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "grade" && (
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-zinc-900 text-center mb-2">
            What grade are you in?
          </h1>
          <p className="text-zinc-500 text-center mb-8">
            We&apos;ll start with problems at the right level.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {GRADE_BANDS.map((g) => (
              <button
                key={g.id}
                onClick={() => handleGradeSelect(g.id)}
                className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 py-6 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                <span className="text-xl font-bold text-zinc-900">{g.label}</span>
                <span className="text-sm text-zinc-400 mt-1">{g.sub}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep("goal")}
            className="mt-6 w-full text-center text-sm text-zinc-400 hover:text-zinc-600"
          >
            ← Back
          </button>
        </div>
      )}

      {step === "time" && (
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-zinc-900 text-center mb-2">
            How much time do you have?
          </h1>
          <p className="text-zinc-500 text-center mb-8">
            Papaya will fit a complete session into your window.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTimeSelect(t.id)}
                className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 py-6 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                <span className="text-xl font-bold text-zinc-900">{t.label}</span>
                <span className="text-sm text-zinc-400 mt-1">{t.sub}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(goal && goal in EXAM_TOPICS ? "goal" : "grade")}
            className="mt-6 w-full text-center text-sm text-zinc-400 hover:text-zinc-600"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
