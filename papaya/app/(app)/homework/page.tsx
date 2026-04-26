"use client";

import { useState } from "react";
import Link from "next/link";
import { MathRenderer } from "@/components/math/MathRenderer";

const GRADE_OPTIONS = [
  { id: "", label: "Any grade" },
  { id: "k2", label: "K–2" },
  { id: "3-5", label: "3–5" },
  { id: "6-8", label: "6–8" },
  { id: "9-12", label: "9–12" },
];

interface HelpResult {
  topic: string;
  guidance: string;
}

export default function HomeworkHelpPage() {
  const [problem, setProblem] = useState("");
  const [gradeBand, setGradeBand] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HelpResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!problem.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/homework/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: problem.trim(),
          grade_band: gradeBand || undefined,
        }),
      });

      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setError(null);
    setProblem("");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
            ← Home
          </Link>
          <h1 className="text-lg font-bold text-zinc-900">Homework Help</h1>
          <div className="w-16" />
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="rounded-2xl bg-white border border-zinc-200 p-5 shadow-sm">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Paste or type your homework problem
              </label>
              <textarea
                value={problem}
                onChange={e => setProblem(e.target.value)}
                placeholder="e.g. A train leaves Chicago at 60 mph. Another leaves New York at 80 mph..."
                rows={5}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 resize-none outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-zinc-500 shrink-0">Grade level:</label>
              <select
                value={gradeBand}
                onChange={e => setGradeBand(e.target.value)}
                className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800 outline-none focus:border-indigo-400 bg-white"
              >
                {GRADE_OPTIONS.map(g => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={!problem.trim() || loading}
              className="w-full rounded-xl bg-indigo-600 py-3.5 text-white font-semibold text-base hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Working it out…" : "Get Help"}
            </button>

            {loading && (
              <div className="flex justify-center">
                <div className="w-6 h-6 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
              </div>
            )}
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Topic badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Topic:</span>
              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-0.5 text-sm text-indigo-700 font-medium">
                {result.topic}
              </span>
            </div>

            {/* Problem recap */}
            <div className="rounded-2xl bg-white border border-zinc-200 px-5 py-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Your problem</p>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{problem}</p>
            </div>

            {/* Guidance */}
            <div className="rounded-2xl bg-white border border-zinc-200 px-5 py-5 shadow-sm">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Step-by-step help</p>
              <MathRenderer
                latex={result.guidance}
                className="text-zinc-800 text-sm leading-relaxed"
              />
            </div>

            <button
              onClick={handleReset}
              className="w-full rounded-xl border border-zinc-200 bg-white py-3 text-zinc-700 font-semibold hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              Try a different problem
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
