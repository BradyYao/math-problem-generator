"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const GOALS = [
  { id: "sat",     label: "SAT prep",             icon: "📝", color: "hover:border-orange-400 hover:bg-orange-50", active: "border-orange-400 bg-orange-50" },
  { id: "act",     label: "ACT prep",             icon: "📋", color: "hover:border-yellow-400 hover:bg-yellow-50", active: "border-yellow-400 bg-yellow-50" },
  { id: "amc",     label: "Competition",          icon: "🏅", color: "hover:border-purple-400 hover:bg-purple-50", active: "border-purple-400 bg-purple-50" },
  { id: "school",  label: "School / homework help", icon: "🏫", color: "hover:border-blue-400 hover:bg-blue-50",   active: "border-blue-400 bg-blue-50" },
  { id: "casual",  label: "Just practice",        icon: "🎯", color: "hover:border-green-400 hover:bg-green-50",  active: "border-green-400 bg-green-50" },
];

const GRADE_BANDS_DATA = [
  { id: "k2",  label: "K–2",  sub: "Ages 5–8",   band: "k2" },
  { id: "3-5", label: "3–5",  sub: "Ages 8–11",  band: "3-5" },
  { id: "6",   label: "6th",  sub: "Grade 6",    band: "6-8" },
  { id: "7",   label: "7th",  sub: "Grade 7",    band: "6-8" },
  { id: "8",   label: "8th",  sub: "Grade 8",    band: "6-8" },
  { id: "9",   label: "9th",  sub: "Grade 9",    band: "9-12" },
  { id: "10",  label: "10th", sub: "Grade 10",   band: "9-12" },
  { id: "11",  label: "11th", sub: "Grade 11",   band: "9-12" },
  { id: "12",  label: "12th", sub: "Grade 12",   band: "9-12" },
] as const;

const TIME_OPTIONS = [
  { id: 5,  label: "5 min",  sub: "Quick hit",      color: "hover:border-green-400 hover:bg-green-50" },
  { id: 10, label: "10 min", sub: "Short session",   color: "hover:border-blue-400 hover:bg-blue-50" },
  { id: 20, label: "20 min", sub: "Solid practice",  color: "hover:border-orange-400 hover:bg-orange-50" },
  { id: 30, label: "30 min", sub: "Deep work",       color: "hover:border-purple-400 hover:bg-purple-50" },
];

const EXAM_TOPICS: Record<string, string[]> = {
  sat: ["algebra.alg1.linear-equations", "algebra.alg2.quadratic-equations", "number.ratios.percent", "geometry.area.circles"],
  act: ["algebra.alg1.linear-equations", "algebra.alg2.quadratic-equations", "number.ratios.percent", "geometry.triangles.pythagorean"],
};

const DEFAULT_TOPICS: Record<string, string[]> = {
  "k2":  ["number.arithmetic.addition-subtraction", "number.counting.compare-numbers"],
  "3-5": ["number.fractions.add-subtract", "number.arithmetic.multiplication"],
  "6-8": ["algebra.alg1.linear-equations", "number.ratios.percent"],
  "9-12": ["algebra.alg2.quadratic-equations", "algebra.alg1.linear-systems"],
};

const DOMAIN_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  number:      { icon: "🔢", color: "hover:border-blue-400 hover:bg-blue-50",   label: "Numbers & Operations" },
  algebra:     { icon: "✏️", color: "hover:border-purple-400 hover:bg-purple-50", label: "Algebra" },
  geometry:    { icon: "📐", color: "hover:border-green-400 hover:bg-green-50",  label: "Geometry" },
  functions:   { icon: "📈", color: "hover:border-teal-400 hover:bg-teal-50",    label: "Functions" },
  measurement: { icon: "📏", color: "hover:border-cyan-400 hover:bg-cyan-50",    label: "Measurement & Data" },
  stats:       { icon: "📊", color: "hover:border-indigo-400 hover:bg-indigo-50", label: "Statistics & Probability" },
  precalc:     { icon: "∑",  color: "hover:border-rose-400 hover:bg-rose-50",    label: "Precalculus" },
  competition: { icon: "🏅", color: "hover:border-amber-400 hover:bg-amber-50",  label: "Competition Math" },
};

interface TopicGroup {
  domain: string;
  label: string;
  topicIds: string[];
}

type Step = "goal" | "grade" | "topic" | "time";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("goal");
  const [goal, setGoal] = useState<string | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [topicGroups, setTopicGroups] = useState<TopicGroup[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[] | null>(null);
  const [standardCode, setStandardCode] = useState("");

  useEffect(() => {
    if (!grade) return;
    const band = GRADE_BANDS_DATA.find(g => g.id === grade)?.band ?? "6-8";
    setTopicsLoading(true);
    fetch(`/api/topics?grade_band=${band}`)
      .then(r => r.json())
      .then((topics: { id: string; name: string; domain: string }[]) => {
        const grouped = new Map<string, string[]>();
        for (const t of topics) {
          if (!grouped.has(t.domain)) grouped.set(t.domain, []);
          grouped.get(t.domain)!.push(t.id);
        }
        setTopicGroups(
          Array.from(grouped.entries()).map(([domain, ids]) => ({
            domain,
            label: DOMAIN_CONFIG[domain]?.label ?? domain.charAt(0).toUpperCase() + domain.slice(1),
            topicIds: ids,
          }))
        );
      })
      .catch(() => setTopicGroups([]))
      .finally(() => setTopicsLoading(false));
  }, [grade]);

  function handleGoalSelect(id: string) {
    if (id === "school") {
      router.push("/homework");
      return;
    }
    setGoal(id);
    setStep(id in EXAM_TOPICS ? "time" : "grade");
  }

  function handleGradeSelect(id: string) {
    setGrade(id);
    setSelectedTopicIds(null);
    setStep("topic");
  }

  function handleTopicSelect(topicIds: string[]) {
    const MAX = 5;
    const selected = topicIds.length > MAX
      ? [...topicIds].sort(() => Math.random() - 0.5).slice(0, MAX)
      : topicIds;
    setSelectedTopicIds(selected);
    setStep("time");
  }

  function handleMixedSelect() {
    const mixed = topicGroups.length > 0
      ? topicGroups
          .slice(0, 5)
          .map(g => g.topicIds[Math.floor(Math.random() * g.topicIds.length)])
          .filter(Boolean)
      : null;
    const gradeBand = grade
      ? (GRADE_BANDS_DATA.find(g => g.id === grade)?.band ?? "6-8")
      : "6-8";
    handleTopicSelect(mixed ?? DEFAULT_TOPICS[gradeBand] ?? DEFAULT_TOPICS["6-8"]);
  }

  function handleTimeSelect(minutes: number) {
    const gradeBand = grade
      ? (GRADE_BANDS_DATA.find(g => g.id === grade)?.band ?? "6-8")
      : "6-8";
    const allTopicsForGrade = topicGroups.length > 0
      ? topicGroups.flatMap(g => g.topicIds)
      : null;
    const topicIds =
      selectedTopicIds ??
      (goal ? EXAM_TOPICS[goal] : null) ??
      allTopicsForGrade ??
      DEFAULT_TOPICS[gradeBand] ??
      DEFAULT_TOPICS["6-8"];

    const params = new URLSearchParams({
      topics: topicIds.join(","),
      time: String(minutes),
      mode: "practice",
    });
    if (standardCode.trim()) params.set("standard", standardCode.trim());
    router.push(`/practice/new?${params.toString()}`);
  }

  const isExamGoal = !!(goal && goal in EXAM_TOPICS);
  const currentSteps: Step[] = isExamGoal
    ? ["goal", "time"]
    : ["goal", "grade", "topic", "time"];
  const stepIndex = currentSteps.indexOf(step);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16"
      style={{ background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 60%)" }}>
      {/* Progress dots */}
      <div className="flex gap-2 mb-10">
        {currentSteps.map((s, i) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all ${
              i <= stepIndex ? "w-6 bg-orange-500" : "w-2 bg-zinc-200"
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
                className={`flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left transition-all ${g.color}`}
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
          <div className="grid grid-cols-3 gap-3">
            {GRADE_BANDS_DATA.map((g) => (
              <button
                key={g.id}
                onClick={() => handleGradeSelect(g.id)}
                className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-5 hover:border-orange-400 hover:bg-orange-50 transition-all"
              >
                <span className="text-lg font-bold text-zinc-900">{g.label}</span>
                <span className="text-xs text-zinc-400 mt-1">{g.sub}</span>
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

      {step === "topic" && (
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-zinc-900 text-center mb-2">
            Pick a topic
          </h1>
          <p className="text-zinc-500 text-center mb-8">
            Focus on one area or mix it up.
          </p>
          {topicsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {topicGroups.map((g) => {
                const cfg = DOMAIN_CONFIG[g.domain] ?? { icon: "📚", color: "hover:border-orange-400 hover:bg-orange-50", label: g.label };
                return (
                  <button
                    key={g.domain}
                    onClick={() => handleTopicSelect(g.topicIds)}
                    className={`flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left transition-all ${cfg.color}`}
                  >
                    <span className="text-xl">{cfg.icon}</span>
                    <span className="font-medium text-zinc-900">{g.label}</span>
                  </button>
                );
              })}
              <button
                onClick={handleMixedSelect}
                className="flex items-center gap-4 rounded-2xl border-2 border-orange-200 bg-orange-50 px-5 py-4 text-left hover:border-orange-400 hover:bg-orange-100 transition-all"
              >
                <span className="text-xl">🎲</span>
                <span className="font-medium text-orange-700">Mix it up — all topics</span>
              </button>
            </div>
          )}
          {/* Optional standards input */}
          <div className="mt-4 flex flex-col gap-1">
            <label className="text-xs text-zinc-400 font-medium">
              Studying a specific standard? (optional)
            </label>
            <input
              type="text"
              value={standardCode}
              onChange={e => setStandardCode(e.target.value)}
              placeholder="e.g. 6.EE.A.1 or 8.G.B.7"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
            />
          </div>

          <button
            onClick={() => setStep("grade")}
            className="mt-4 w-full text-center text-sm text-zinc-400 hover:text-zinc-600"
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
                className={`flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 py-6 transition-all ${t.color}`}
              >
                <span className="text-xl font-bold text-zinc-900">{t.label}</span>
                <span className="text-sm text-zinc-400 mt-1">{t.sub}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(isExamGoal ? "goal" : "topic")}
            className="mt-6 w-full text-center text-sm text-zinc-400 hover:text-zinc-600"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
