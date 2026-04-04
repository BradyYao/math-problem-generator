"use client";

import { useState } from "react";
import { MathRenderer } from "./MathRenderer";

interface HintPanelProps {
  sessionId: string;
  currentHintsUsed: number;  // 0–3 (how many levels already revealed)
  disabled?: boolean;
  onHintRevealed: (level: number) => void;
}

interface RevealedHint {
  level: number;
  text: string;
}

const HINT_LABELS = ["", "Direction", "First Step", "Almost There"];
const HINT_PENALTIES = [0, -1, -3, -6];

export function HintPanel({ sessionId, currentHintsUsed, disabled, onHintRevealed }: HintPanelProps) {
  const [hints, setHints] = useState<RevealedHint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextLevel = currentHintsUsed + 1;
  const canReveal = nextLevel <= 3 && !disabled;

  async function revealHint() {
    if (!canReveal || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/session/${sessionId}/hint/${nextLevel}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to load hint");
        return;
      }

      setHints(prev => [...prev, { level: data.level, text: data.text }]);
      onHintRevealed(data.level);
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      {/* Revealed hints */}
      {hints.length > 0 && (
        <div className="flex flex-col gap-3 px-4 pt-4">
          {hints.map(hint => (
            <div key={hint.level}>
              <p className="text-xs font-semibold text-amber-700 mb-1">
                Hint {hint.level}: {HINT_LABELS[hint.level]}
              </p>
              <MathRenderer latex={hint.text} className="text-gray-700 text-sm leading-relaxed" />
            </div>
          ))}
        </div>
      )}

      {/* Reveal button */}
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        {canReveal ? (
          <button
            onClick={revealHint}
            disabled={loading}
            className="
              flex items-center gap-2 text-sm font-medium text-amber-800
              hover:text-amber-900 transition-colors disabled:opacity-60
            "
          >
            <span>{loading ? "Loading..." : hints.length === 0 ? "Need a hint?" : `Show hint ${nextLevel}`}</span>
            {!loading && (
              <span className="text-xs text-amber-600">
                ({HINT_PENALTIES[nextLevel]} pts)
              </span>
            )}
          </button>
        ) : currentHintsUsed >= 3 ? (
          <p className="text-xs text-amber-600">No more hints available</p>
        ) : null}

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}
