import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getAI(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// Model IDs per notes/architecture-plan.md
export const MODELS = {
  /** Full problem generation — best quality */
  generation: "claude-sonnet-4-6" as const,
  /** Hints, validations, short tasks — cost-optimized */
  fast: "claude-haiku-4-5-20251001" as const,
} as const;
