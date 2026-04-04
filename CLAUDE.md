# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This project is in the planning phase. No code exists yet. The relevant context is in `notes/`:

- `notes/product-plan.md` — Full product requirements plan (personas, MVP features, open questions)
- `notes/mar 22,2026 MathProbGen_transcript.md` — Brainstorming session transcript and AI summary

## What We're Building

**Papaya** — a responsive mobile-first web app that gives K-12 students on-demand, personalized math practice problems matched to their skill level and available time.

Key product decisions already made:
- Platform: Responsive web (no native app in MVP)
- Problems: Hybrid — curated past exam problems (AMC, SAT) + AI-generated fill
- MVP features: adaptive problem generation, multi-level hints, progress tracking, leaderboards, challenge-a-friend

## Before Writing Code

The following design documents need to exist before implementation begins (per `notes/product-plan.md`):

- `notes/content-taxonomy.md` — K-12 topic hierarchy mapped to SAT/AMC exam domains
- `notes/data-model.md` — Schema for skill model, problem metadata, session data, goal tracking
- `notes/scoring-spec.md` — Papaya Score formula and skill model update rules
- `notes/tone-guide.md` — Voice/style guide and AI prompt guidelines for consistent tutor tone

## Open Questions to Resolve Before Building

See the "Key Open Questions" section in `notes/product-plan.md`. The most blocking ones are:
1. Monetization model (affects feature gating and paywall placement in the UI)
2. COPPA compliance strategy (affects onboarding flow design)
3. AI problem quality control process (affects the problem generation pipeline architecture)
