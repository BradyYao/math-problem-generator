"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ProfileData {
  display_name: string | null;
  weekly_score: number;
  weekly_rank: number | null;
  all_time: {
    total_sessions: number;
    total_correct: number;
    total_problems: number;
  };
  recent_sessions: Array<{
    id: string;
    mode: string;
    started_at: string;
    problems_delivered: number;
    problems_correct: number;
    score: number;
  }>;
}

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          setError(res.status === 401 ? "Sign in to view your profile." : "Failed to load profile.");
          return;
        }
        setData(await res.json());
      } catch {
        setError("Network error.");
      }
    }
    load();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
        <p className="text-zinc-500">{error}</p>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          ← Home
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const accuracy =
    data.all_time.total_problems > 0
      ? Math.round((data.all_time.total_correct / data.all_time.total_problems) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
            ← Home
          </Link>
          <h1 className="text-lg font-bold text-zinc-900">My Stats</h1>
          <div className="w-12" />
        </div>

        {data.display_name && (
          <p className="text-center text-zinc-500">{data.display_name}</p>
        )}

        {/* Weekly score card */}
        <div className="rounded-2xl bg-indigo-600 text-white px-6 py-6 text-center">
          <p className="text-sm text-indigo-200 mb-1">This week</p>
          <p className="text-4xl font-bold">{data.weekly_score}</p>
          <p className="text-sm text-indigo-200 mt-1">Papaya Points</p>
          {data.weekly_rank != null && (
            <p className="text-indigo-200 text-xs mt-3">
              Rank #{data.weekly_rank} this week
            </p>
          )}
        </div>

        {/* All-time stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white border border-zinc-100 px-4 py-4 text-center">
            <p className="text-2xl font-bold text-zinc-900">{data.all_time.total_sessions}</p>
            <p className="text-xs text-zinc-400 mt-1">Sessions</p>
          </div>
          <div className="rounded-xl bg-white border border-zinc-100 px-4 py-4 text-center">
            <p className="text-2xl font-bold text-zinc-900">{data.all_time.total_correct}</p>
            <p className="text-xs text-zinc-400 mt-1">Correct</p>
          </div>
          <div className="rounded-xl bg-white border border-zinc-100 px-4 py-4 text-center">
            <p className="text-2xl font-bold text-zinc-900">{accuracy}%</p>
            <p className="text-xs text-zinc-400 mt-1">Accuracy</p>
          </div>
        </div>

        {/* Recent sessions */}
        {data.recent_sessions.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">Recent Sessions</h2>
            <div className="flex flex-col gap-2">
              {data.recent_sessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/practice/${s.id}/summary`}
                  className="flex items-center justify-between rounded-xl bg-white border border-zinc-100 px-4 py-3 hover:border-indigo-300 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900 capitalize">{s.mode}</p>
                    <p className="text-xs text-zinc-400">
                      {new Date(s.started_at).toLocaleDateString()} — {s.problems_correct}/{s.problems_delivered} correct
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-indigo-600">
                    {s.score} pts
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Start practicing CTA */}
        <Link
          href="/onboarding"
          className="w-full rounded-xl bg-indigo-600 py-3.5 text-white font-semibold text-base text-center hover:bg-indigo-700 transition-colors"
        >
          Start practicing
        </Link>
      </div>
    </div>
  );
}
