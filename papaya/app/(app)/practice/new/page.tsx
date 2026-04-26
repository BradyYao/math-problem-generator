"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function NewSessionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const topics = searchParams.get("topics");
    const time = searchParams.get("time");
    const mode = searchParams.get("mode") ?? "practice";
    const standard = searchParams.get("standard");

    if (!topics || !time) {
      router.replace("/onboarding");
      return;
    }

    async function beginSession() {
      try {
        const res = await fetch("/api/session/begin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic_ids: topics!.split(","),
            time_budget_minutes: parseInt(time!),
            mode,
            ...(standard ? { standard_code: standard } : {}),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          const msg = typeof data?.error === "string"
            ? data.error
            : res.status === 504 || res.status === 408
              ? "Session setup timed out — try fewer topics or a shorter time."
              : "Something went wrong. Try again.";
          setError(msg);
          return;
        }

        router.replace(`/practice/${data.session_id}`);
      } catch {
        setError("Network error. Please check your connection.");
      }
    }

    beginSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
        <p className="text-red-600 text-center">{error}</p>
        <button
          onClick={() => router.replace("/onboarding")}
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
      <p className="text-zinc-500 text-sm">Getting your problems ready…</p>
    </div>
  );
}

export default function NewSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
          <p className="text-zinc-500 text-sm">Getting your problems ready…</p>
        </div>
      }
    >
      <NewSessionInner />
    </Suspense>
  );
}
