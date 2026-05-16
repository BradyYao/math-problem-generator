"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LeaderboardWidget } from "@/components/leaderboard/LeaderboardWidget";

interface MilestoneStatus {
  id: string;
  name: string;
  threshold: number;
  emoji: string;
  description: string;
  earned: boolean;
}

interface ProfileData {
  display_name: string | null;
  weekly_score: number;
  weekly_rank: number | null;
  all_time_points: number;
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
  milestones: MilestoneStatus[];
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
        <Link href="/" className="text-sm text-orange-500 hover:underline">← Home</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const accuracy =
    data.all_time.total_problems > 0
      ? Math.round((data.all_time.total_correct / data.all_time.total_problems) * 100)
      : 0;

  const nextMilestone = data.milestones.find(m => !m.earned);
  const ptsToNext = nextMilestone ? Math.max(0, nextMilestone.threshold - data.all_time_points) : 0;
  const progressPct = nextMilestone
    ? Math.min(100, Math.round((data.all_time_points / nextMilestone.threshold) * 100))
    : 100;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #fff7ed 0%, #f9fafb 30%)" }}>
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">← Home</Link>
          <h1 className="text-lg font-bold text-zinc-900">My Stats</h1>
          <div className="w-12" />
        </div>

        {data.display_name && (
          <p className="text-center text-zinc-500">{data.display_name}</p>
        )}

        {/* Weekly score card */}
        <div
          className="rounded-2xl text-white px-6 py-6 text-center shadow-lg"
          style={{ background: "linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fbbf24 100%)" }}
        >
          <p className="text-sm text-orange-100 mb-1">This week</p>
          <p className="text-4xl font-bold">{data.weekly_score}</p>
          <p className="text-sm text-orange-100 mt-1">Papaya Points</p>
          {data.weekly_rank != null && (
            <p className="text-orange-100 text-xs mt-3">Rank #{data.weekly_rank} this week</p>
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

        {/* Achievements */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-900">Achievements</h2>
            <span className="text-xs text-zinc-400">{data.all_time_points.toLocaleString()} pts all-time</span>
          </div>

          {/* Progress bar to next milestone */}
          {nextMilestone && (
            <div className="mb-4 rounded-xl bg-white border border-zinc-100 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500">Next: <span className="font-medium text-zinc-700">{nextMilestone.name}</span></span>
                <span className="text-xs font-semibold text-orange-600">{ptsToNext.toLocaleString()} pts to go</span>
              </div>
              <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${progressPct}%`,
                    background: "linear-gradient(90deg, #f97316, #fbbf24)",
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-zinc-400">{data.all_time_points.toLocaleString()}</span>
                <span className="text-xs text-zinc-400">{nextMilestone.threshold.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {data.milestones.map(m => (
              <div
                key={m.id}
                className={`flex items-center gap-4 rounded-2xl border px-4 py-4 transition-all ${
                  m.earned
                    ? "bg-white border-orange-200 shadow-sm"
                    : "bg-zinc-50 border-zinc-100"
                }`}
              >
                <span className={`text-3xl ${m.earned ? "" : "grayscale opacity-40"}`}>
                  {m.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${m.earned ? "text-zinc-900" : "text-zinc-400"}`}>
                    {m.name}
                  </p>
                  <p className={`text-xs mt-0.5 ${m.earned ? "text-zinc-500" : "text-zinc-400"}`}>
                    {m.earned ? m.description : `Reach ${m.threshold.toLocaleString()} total points`}
                  </p>
                </div>
                {m.earned ? (
                  <span className="shrink-0 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    Earned ✓
                  </span>
                ) : (
                  <span className="shrink-0 text-xs font-medium text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                    {m.threshold.toLocaleString()} pts
                  </span>
                )}
              </div>
            ))}
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
                  className="flex items-center justify-between rounded-xl bg-white border border-zinc-100 px-4 py-3 hover:border-orange-200 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900 capitalize">{s.mode}</p>
                    <p className="text-xs text-zinc-400">
                      {new Date(s.started_at).toLocaleDateString()} — {s.problems_correct}/{s.problems_delivered} correct
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-orange-500">{s.score} pts</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">This Week&apos;s Leaderboard</h2>
          <LeaderboardWidget />
        </div>

        <Link
          href="/onboarding"
          className="w-full rounded-xl bg-orange-500 py-3.5 text-white font-semibold text-base text-center hover:bg-orange-600 transition-colors"
        >
          Start practicing
        </Link>
      </div>
    </div>
  );
}
