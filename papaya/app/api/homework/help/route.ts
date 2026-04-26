import { NextResponse } from "next/server";
import { z } from "zod";
import { getAI, MODELS } from "@/lib/ai/client";
import { buildTutoringSystemPrompt, buildTutoringPrompt } from "@/lib/ai/prompts/tutoring";
import type { GradeBand } from "@/types/problem";

const Body = z.object({
  problem: z.string().min(3).max(2000),
  grade_band: z.enum(["k2", "3-5", "6-8", "9-12"]).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { problem, grade_band } = parsed.data;

  const ai = getAI();
  const response = await ai.messages.create({
    model: MODELS.generation,
    max_tokens: 2048,
    system: buildTutoringSystemPrompt(),
    messages: [
      {
        role: "user",
        content: buildTutoringPrompt({ problem, gradeBand: grade_band as GradeBand | undefined }),
      },
    ],
  });

  const rawText = response.content
    .filter(c => c.type === "text")
    .map(c => c.text)
    .join("");

  let parsed2: { topic: string; guidance: string };
  try {
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    parsed2 = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: "Could not parse tutor response" }, { status: 502 });
  }

  if (typeof parsed2.topic !== "string" || typeof parsed2.guidance !== "string") {
    return NextResponse.json({ error: "Unexpected tutor response shape" }, { status: 502 });
  }

  return NextResponse.json({
    topic: parsed2.topic,
    guidance: parsed2.guidance,
  });
}
