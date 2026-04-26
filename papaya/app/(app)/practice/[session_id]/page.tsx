"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { ProblemCard } from "@/components/problem/ProblemCard";
import { ProblemFeedback } from "@/components/problem/ProblemFeedback";
import { MilestoneModal } from "@/components/MilestoneModal";
import { useSessionStore } from "@/stores/session-store";
import type { AnswerResponse, MilestoneEarned } from "@/types/session";
import type { Problem } from "@/types/problem";

interface PageProps {
  params: Promise<{ session_id: string }>;
}

export default function PracticeSessionPage({ params }: PageProps) {
  const { session_id: sessionId } = use(params);
  const router = useRouter();
  const store = useSessionStore();

  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastResponse, setLastResponse] = useState<AnswerResponse | null>(null);
  const [milestone, setMilestone] = useState<MilestoneEarned | null>(null);

  // Resume session on mount (cold start or page refresh)
  useEffect(() => {
    if (store.sessionId === sessionId && store.phase !== "loading") return;

    async function resume() {
      try {
        const res = await fetch(`/api/session/${sessionId}/resume`);
        if (!res.ok) {
          router.replace("/practice");
          return;
        }
        const data = await res.json();
        store.initSession({
          sessionId: data.session_id,
          mode: data.mode,
          problem: data.current_problem,
          totalProblems: data.total_problems,
          timeBudgetMinutes: data.time_budget_minutes ?? 20,
        });
        // Restore hints used
        if (data.hints_this_problem > 0) {
          for (let i = 0; i < data.hints_this_problem; i++) {
            store.incrementHintsUsed();
          }
        }
      } catch {
        router.replace("/practice");
      }
    }

    resume();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleSubmit = useCallback(async () => {
    if (!store.currentProblem || !answer.trim() || submitting) return;

    setSubmitting(true);
    const startTime = store.timerStartedAt ?? Date.now();
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    try {
      const res = await fetch(`/api/session/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: store.currentProblem.id,
          answer: answer.trim(),
          time_spent_seconds: timeSpent,
        }),
      });

      const data: AnswerResponse = await res.json();
      setLastResponse(data);
      store.recordAnswer(data);
      if (data.milestone_earned) setMilestone(data.milestone_earned);
    } catch {
      // Network failure — allow retry
    } finally {
      setSubmitting(false);
    }
  }, [answer, sessionId, store, submitting]);

  const handleNext = useCallback(async () => {
    if (!lastResponse) return;

    if (lastResponse.session_complete) {
      store.completeSession();
      router.push(`/practice/${sessionId}/summary`);
      return;
    }

    // Update current problem from API response
    if (lastResponse.next_problem) {
      // Directly mutate store state via initSession equivalent
      store.advanceProblem();
      // Store the next problem — we need a dedicated action for this
      useSessionStore.setState({ currentProblem: lastResponse.next_problem as Problem });
    }

    setAnswer("");
    setLastResponse(null);
  }, [lastResponse, sessionId, store, router]);

  if (store.phase === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!store.currentProblem) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        Problem not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top progress bar */}
      <div className="w-full bg-gray-200 h-1.5">
        <div
          className="bg-indigo-600 h-1.5 transition-all duration-500"
          style={{ width: `${((store.currentIndex) / store.totalProblems) * 100}%` }}
        />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Top bar: home link + score */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            ← Home
          </button>
          <span className="text-sm font-semibold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
            {store.papayaScore} pts
          </span>
        </div>

        {store.phase === "answering" && (
          <ProblemCard
            problem={store.currentProblem}
            sessionId={sessionId}
            currentIndex={store.currentIndex}
            totalProblems={store.totalProblems}
            hintsUsed={store.hintsUsed}
            selectedAnswer={answer}
            submitted={submitting}
            onAnswerChange={val => {
              setAnswer(val);
            }}
            onSubmit={handleSubmit}
            onHintRevealed={store.incrementHintsUsed}
          />
        )}

        {store.phase === "feedback" && lastResponse && (
          <ProblemFeedback
            isCorrect={lastResponse.is_correct}
            correctAnswer={lastResponse.correct_answer}
            explanation={lastResponse.explanation}
            skillDelta={lastResponse.skill_delta}
            scoreBreakdown={lastResponse.score_breakdown}
            sessionComplete={lastResponse.session_complete}
            onNext={handleNext}
          />
        )}
      </div>

      {milestone && (
        <MilestoneModal
          milestone={milestone}
          onClose={() => setMilestone(null)}
        />
      )}
    </div>
  );
}
