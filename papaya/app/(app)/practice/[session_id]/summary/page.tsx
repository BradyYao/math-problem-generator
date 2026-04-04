"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { MathRenderer } from "@/components/math/MathRenderer";

interface TopicBreakdown {
  topic_id: string;
  topic_name: string;
  answered: number;
  correct: number;
  accuracy: number;
  skill_delta: number;
}

interface SummaryData {
  session_id: string;
  mode: string;
  total_answered: number;
  total_correct: number;
  accuracy: number;
  total_time_seconds: number;
  papaya_score: number;
  topic_breakdown: TopicBreakdown[];
  answers: Array<{
    problem_id: string;
    stem_latex: string;
    user_answer: string;
    correct_answer: string;
    is_correct: boolean;
    explanation: string | null;
    hints_used: number;
    time_spent_seconds: number;
    topic_name: string;
    difficulty: number;
  }>;
}

interface PageProps {
  params: Promise<{ session_id: string }>;
}

export default function SessionSummaryPage({ params }: PageProps) {
  const { session_id: sessionId } = use(params);
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/session/${sessionId}/summary`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500">Could not load session summary.</p>
        <Link href="/practice" className="text-indigo-600 underline">Back to Practice</Link>
      </div>
    );
  }

  const minutes = Math.floor(data.total_time_seconds / 60);
  const seconds = data.total_time_seconds % 60;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900">Session Complete!</h1>

        {/* Score card */}
        <div className="rounded-2xl bg-indigo-600 text-white p-6 flex justify-between items-center">
          <div>
            <p className="text-indigo-200 text-sm">Papaya Points</p>
            <p className="text-4xl font-bold">{data.papaya_score}</p>
          </div>
          <div className="text-right">
            <p className="text-indigo-200 text-sm">Accuracy</p>
            <p className="text-4xl font-bold">{data.accuracy}%</p>
          </div>
          <div className="text-right">
            <p className="text-indigo-200 text-sm">Time</p>
            <p className="text-2xl font-bold">{minutes}:{String(seconds).padStart(2, "0")}</p>
          </div>
        </div>

        {/* Topic breakdown */}
        {data.topic_breakdown.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-700 mb-4">By Topic</h2>
            <div className="flex flex-col gap-3">
              {data.topic_breakdown.map(t => (
                <div key={t.topic_id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{t.topic_name}</p>
                    <p className="text-xs text-gray-500">{t.correct}/{t.answered} correct</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-700">{t.accuracy}%</p>
                    <p className={`text-xs font-medium ${t.skill_delta >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {t.skill_delta >= 0 ? "+" : ""}{(t.skill_delta * 100).toFixed(0)}% skill
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review incorrect answers */}
        {data.answers.filter(a => !a.is_correct).length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Review Missed Problems</h2>
            <div className="flex flex-col gap-5">
              {data.answers.filter(a => !a.is_correct).map((a, i) => (
                <div key={a.problem_id} className="border-t border-gray-100 pt-4 first:border-0 first:pt-0">
                  <MathRenderer latex={a.stem_latex} className="text-gray-800 text-sm mb-2" />
                  <p className="text-xs text-gray-500">
                    Your answer: <span className="font-medium text-red-500">{a.user_answer}</span>
                    {" · "}
                    Correct: <span className="font-medium text-green-600">{a.correct_answer}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex gap-3">
          <Link
            href="/practice"
            className="flex-1 rounded-xl border-2 border-indigo-600 text-indigo-600 font-semibold py-3.5 text-center hover:bg-indigo-50 transition-colors"
          >
            Practice Again
          </Link>
          <Link
            href="/progress"
            className="flex-1 rounded-xl bg-indigo-600 text-white font-semibold py-3.5 text-center hover:bg-indigo-700 transition-colors"
          >
            View Progress
          </Link>
        </div>
      </div>
    </div>
  );
}
