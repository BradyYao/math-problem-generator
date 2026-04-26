"use client";

import type { MilestoneEarned } from "@/types/session";

interface MilestoneModalProps {
  milestone: MilestoneEarned;
  onClose: () => void;
}

export function MilestoneModal({ milestone, onClose }: MilestoneModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl px-8 py-10 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="text-7xl mb-4 leading-none">{milestone.emoji}</div>
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">
          Achievement Unlocked
        </p>
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">{milestone.name}</h2>
        <p className="text-sm text-zinc-500 mb-8">{milestone.description}</p>
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-indigo-600 py-3 text-white font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all"
        >
          Keep going!
        </button>
      </div>
    </div>
  );
}
