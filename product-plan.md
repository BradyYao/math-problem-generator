# Papaya — Product Requirements Plan

## Context
Brady and his parents brainstormed a math practice app (working name: "Papaya") that solves a real gap: there is no on-demand tool that gives a student the *right* math problems for their *exact* skill level in whatever time they have *right now*. Existing tools (Khan Academy, AoPS, worksheet generators) are either too structured and slow, or too generic. This document is the product plan for what to build.

**Confirmed decisions:**
- Target: Broad K-12 students (not just competition math)
- Platform: Responsive mobile-first web app (no native app in MVP)
- Problems source: Hybrid — curated real past problems (AMC, SAT, etc.) + AI-generated fill
- MVP features: Core problem gen, hints & explanations, progress tracking, leaderboards + challenge-a-friend

---

## User Personas (5 types)

| Persona | Age | Context | Key need |
|---|---|---|---|
| The Exam Prepper (Sofia) | 16 | SAT in 4 months, 20–30 min sessions | Track progress toward a score target |
| The Casual Dabbler (Marcus) | 13 | 5–10 min bursts, motivated by social | Leaderboard, quick wins, challenges |
| The Catch-Up Student (Aaliyah) | 10 | Struggles with fractions, needs patience | Multi-step hints, non-judgmental tone |
| The Competition Kid (James) | 15 | AMC prep, 30–45 min focused sessions | Hard problems, solution walkthroughs |
| The Busy Parent (David) | 42 | Checks in occasionally | Weekly summary, accountability signals |

---

## MVP Features — Detailed Requirements

### 1. Onboarding & Skill Assessment
- **Two entry paths:** "Start practicing" (quick 5-question adaptive placement) or "Set a goal" (exam-oriented guided setup)
- No account required to begin — account prompt comes after first session ("Save your progress")
- Placement quiz: 3–5 adaptive questions, adjusts difficulty per answer, concludes early if confident
- Result shown as plain language (e.g., "Solid 7th grade level in algebra"), never a raw score
- Goal options: SAT, ACT, AMC 8/10/12, state test, casual practice, topic mastery
- Exam goals: map to exam content domains, estimate weeks to goal with honest uncertainty
- Edge cases: skip placement → defaults to grade-mid, all wrong → "let's start with fundamentals" (no shame framing), all right → "you're strong here, let's find your edge"

### 2. Problem Request Interface
- Simple launcher: topic selector (pill list or search) + time selector (5 / 10 / 20 / 30 min / Custom)
- Smart defaults: pre-fill with user's current weakest area + most common session length
- Topic taxonomy by grade band: Elementary, Middle School, High School, Exam-Specific (SAT, AMC domains)
- "Mix it up" option within a grade band
- Time-based session sizing: Papaya estimates problem count based on user's historical time-per-problem + small buffer
- 2-minute warning before session ends — does not interrupt mid-problem
- "Quick Fire" mode: 3 timed problems, no hints, shareable result (for Marcus persona)
- Returning users: "Recommended for you" pre-fill based on goal + recent performance

### 3. Problem Delivery & Solving UX
- One problem at a time — no worksheet scrolling
- LaTeX/KaTeX rendering for math notation; SVG diagrams, scalable on mobile
- Problem source shown subtly (e.g., "AMC 10, 2019" or "Papaya Original") for trust
- Difficulty shown as 1–5 star visual, not a raw number
- Answer types: multiple choice (tap), numeric short answer (accepts fractions + decimals), SAT grid-in
- "Check answer" is a separate button — no accidental submission
- Post-answer (correct): positive confirmation, "show me how anyway" option, next problem CTA
- Post-answer (incorrect): neutral framing — "Not quite — want a hint or the full explanation?", try again up to 2x
- Session progress: thin top bar (% complete by time or problems), streak counter
- Session end summary: score, time, topic-level breakdown vs. prior session, share/challenge button
- Mid-session save: if user closes app, progress is saved and session can be resumed

### 4. Hint System
- Up to 3 hint levels per problem (some problems have 2 if Hint 3 would give away the answer):
  - **Hint 1 — Direction:** High-level reframe. "What is this really asking?" No steps revealed.
  - **Hint 2 — First Step:** Reveals or describes the first meaningful step.
  - **Hint 3 — Almost There:** Gives the penultimate step, leaving only final computation.
- Hints revealed progressively — cannot skip to Hint 3 without reading Hint 2
- Hint panel appears below problem statement, which remains visible throughout
- After each hint: "Does this make sense? Try again" prompt before surfacing next hint
- Full solution: step-by-step with plain language + math, final answer clearly boxed
- After viewing full solution: "Got it? Try a similar problem" — queues a new problem of same type/difficulty
- Hint usage tracked: feeds skill model (hints used = weaker signal of understanding) and surfaces to user as a trend metric (not a shame metric)

### 5. Progress Tracking
**Data captured per problem:** topic, subtopic, difficulty, correct/incorrect, hints used, time, solution viewed, session context

**Student dashboard — 3 sections:**
- **Your Level:** Per-topic skill bars (visual, color-coded: red/orange = gap, green = strength). Tapping a topic shows trend.
- **Your Streak & Sessions:** Consecutive days, total problems this month, GitHub-style activity heatmap, weekly summary stats
- **Your Goals:** (if goal set) Exam readiness estimate vs. target, weeks-to-goal trajectory with uncertainty disclosed

**Per-topic drill-down:** 30-day accuracy trend, hint usage trend, recent problems, difficulty distribution with upgrade prompt

**Notifications (opt-in):** streak reminders, gap alerts (weekly cadence), goal milestone celebrations. No dark patterns.

**Parent view (V1.5, shortly post-MVP):** weekly summary, notable trends, no individual problem data, opt-in email digest

### 6. Adaptive Difficulty
- Per-topic skill estimate, updated after every problem (not per session)
- Skill model update rules:
  - Correct + no hints → skill moves up significantly
  - Correct + hints → skill moves up slightly
  - Incorrect then correct → skill stays flat
  - Incorrect + solution viewed → skill moves down slightly
- Problem selection per session: 70% at/just-above level, 20% below (fluency), 10% stretch
- User-adjustable: "Challenge me" (more stretch) or "Build confidence" (more fluency)
- Plateau detection after 10+ sessions with little improvement → prompt to try related subtopics
- Manual override: "easier / harder" within a session — session-level correction, doesn't permanently override model

### 7. Goal Setting
- Goal types: Exam (SAT/ACT/AMC), School improvement, Casual practice, Topic mastery
- Exam goals: map topic taxonomy to exam content domains, show readiness estimate per domain
- Goal timeline: visual bar from start date to exam date with user trajectory overlaid
- Milestone celebrations at meaningful thresholds (first week, first topic mastered, +50pts estimate)
- Goal editing allowed at any time without resetting historical data
- Data model designed to support multiple goals even though MVP only exposes one at a time (V2)

### 8. Leaderboards
- **Types:** Friends leaderboard (primary), Global leaderboard (grade-band filtered by default)
- **Ranking metric:** Weekly Papaya Score (resets Sunday midnight), not raw problem count
- **Papaya Score = Base difficulty points × Accuracy multiplier × Hint penalty modifier**
  - Difficulty is dominant factor; hints reduce but don't eliminate points; speed is a small optional bonus
  - Formula must be explainable to a 10-year-old in one sentence
- Leaderboard UX: rank, username/avatar, score, one badge. Your own row always pinned even if low-ranked.
- Tapping another user shows public stats (grade band, topics, badges) — no private data
- Privacy: username aliases only (no real names). Under-13 users default to friends leaderboard only (COPPA). Global opt-out available.
- No DMs or chat via leaderboard

### 9. Challenge-a-Friend
**Challenger flow:** Select topic + # problems (3/5/10) + time limit → get a shareable link → complete problems → wait for friend (or don't — both orders are valid). Expires in 48h.

**Recipient flow:** Receive link → play as guest (prompted to register after) or logged-in → same problem set (no peeking at challenger's answers) → results revealed when both complete (or 48h elapsed).

**Results display:** Side-by-side comparison (score, time, accuracy per problem — correct/incorrect only, no answer leak). Winner by Papaya Score. Rematch button. Shareable result graphic.

**Difficulty in challenges (MVP):** Fixed difficulty chosen by challenger with grade-range label. True adaptive challenge comparison is V2.

**Friend management:** Username search or link, mutual acceptance, max 50 friends, block/report required for safety.

### 10. Tutor Tone (Single Voice for MVP)
- MVP uses one carefully crafted default tone — better than multiple mediocre voices
- Tone principles:
  - Encouraging without sycophancy (praise is specific and earned, not automatic)
  - Clear and direct (plain language first, math terminology second)
  - Patient, non-judgmental on errors ("let's look at this differently")
  - Age-aware: lighter/playful for K-5, collegial/peer-like for high school
  - Occasionally warm and dry — light personality without being annoying
- A Papaya style guide + AI prompt framework must be created before launch to ensure AI-generated content matches the voice
- Selectable personalities (V2 consideration based on user research)

---

## Out of Scope for MVP

- Native iOS/Android apps
- Teacher/class dashboard
- Free-response / open-ended problems
- Video explanations
- Peer-created problem sets
- Multi-language support
- Offline mode
- Topic leaderboards
- "Explain this step" micro-hints (tap a solution step)
- Multiple simultaneous goals
- Full Kahoot-style real-time multiplayer

---

## Key Open Questions (Must Decide Before/During Build)

1. **COPPA compliance strategy** — Under-13 users require verifiable parental consent. What is the onboarding gate? (parent email verification? birthdate gate?) This affects onboarding design and legal exposure.

2. **AI problem quality control** — How do we catch incorrect or poorly worded AI-generated problems? Pre-generate + human review queue? On-demand + user flagging? One bad problem destroys student trust.

3. **Monetization model** — Freemium, subscription, family plan, school licensing? Must be decided before MVP so paywall design doesn't require a full rebuild. Does paying unlock features that affect leaderboard fairness?

4. **Challenge difficulty fairness** — If a 7th grader challenges a 10th grader, fixed difficulty is unfair in both directions. Handicap scoring? Grade-band-only challenges? Needs a clear rule and clear communication to users.

5. **Curated problem copyright** — AMC problems are copyrighted by MAA. SAT problems have their own terms. Legal review of which real exam problems can be included and how is required before the curated library is built.

6. **Mastery definition** — At what point does a student "master" a topic? Too generous = meaningless. Too strict = students never feel accomplished. Needs alignment between product and math content experts.

7. **Guest vs. account experience boundary** — Where does the guest experience end? After 1 session? 3 sessions? Affects both conversion rates and engineering scope.

8. **Plateau handling** — If a student is stuck for weeks and the app can't diagnose why, should Papaya recommend external resources (Khan Academy video, a tutor)? This is both a product philosophy and a retention question.

---

## Supporting Documents to Create Before Engineering Begins

| Document | Purpose |
|---|---|
| `notes/content-taxonomy.md` | Full K-12 topic hierarchy mapped to SAT/AMC domains — required before problem library or AI prompts |
| `notes/data-model.md` | Schema for skill model, problem metadata, session data, goal tracking |
| `notes/scoring-spec.md` | Papaya Score formula + skill model update rules — must be locked before leaderboard and adaptive difficulty are built |
| `notes/tone-guide.md` | Papaya voice guide, grade-band tone variations, AI prompt guidelines — required before any hint/explanation copy |
