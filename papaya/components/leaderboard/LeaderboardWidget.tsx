"use client";

import { useEffect, useState } from "react";

interface LeaderboardEntry {
  rank: number;
  display_name: string;
  score: number;
  is_current_user: boolean;
}

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function LeaderboardWidget() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then(r => r.json())
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-6 h-6 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-zinc-400 text-center py-4">
        No scores yet this week. Be the first!
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {entries.map(entry => (
        <div
          key={entry.rank}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
            entry.is_current_user
              ? "bg-indigo-50 border border-indigo-200"
              : "bg-white border border-zinc-100"
          }`}
        >
          <span className="w-8 text-center text-sm font-semibold text-zinc-400 shrink-0">
            {RANK_MEDALS[entry.rank] ?? `#${entry.rank}`}
          </span>
          <span className={`flex-1 text-sm font-medium truncate ${entry.is_current_user ? "text-indigo-700" : "text-zinc-900"}`}>
            {entry.display_name}
            {entry.is_current_user && (
              <span className="ml-2 text-xs text-indigo-400 font-normal">(you)</span>
            )}
          </span>
          <span className="text-sm font-semibold text-indigo-600 shrink-0">
            {entry.score.toLocaleString()} pts
          </span>
        </div>
      ))}
    </div>
  );
}
