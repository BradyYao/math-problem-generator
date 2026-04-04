# Papaya Scoring Specification

This document is the authoritative definition of the Papaya Score formula, the skill model update algorithm, leaderboard rules, and streak logic. All implementations must match these definitions exactly.

---

## 1. Papaya Score Formula

The Papaya Score is the weekly competitive metric displayed on leaderboards. It resets every Sunday at 00:00 UTC.

### Formula

```
PapayaScore = BasePoints + SpeedBonus + StreakBonus + HardBonus - HintPenalty
```

Each component is computed per problem, then summed across the week. StreakBonus is applied once per session.

---

### 1.1 BasePoints

**Rule:** 10 points for each correct answer. 0 points for incorrect answers (no negative scoring).

```
BasePoints(problem) = correct ? 10 : 0
```

**Rationale:** No negative scoring keeps practice psychologically safe. Points are earned, not lost.

---

### 1.2 SpeedBonus

**Rule:** Bonus up to +5 points per correct problem based on how quickly it was solved relative to par time for its difficulty.

```
par_time = [30, 45, 60, 90, 120]  # seconds for difficulty 1–5
SpeedBonus(problem) = correct ? max(0, floor((par_time - time_spent) / par_time × 5)) : 0
```

| Difficulty | Par Time | Solved in half par | Solved at par | Solved over par |
|---|---|---|---|---|
| 1 | 30s | +5 | 0 | 0 |
| 2 | 45s | +5 | 0 | 0 |
| 3 | 60s | +5 | 0 | 0 |
| 4 | 90s | +5 | 0 | 0 |
| 5 | 120s | +5 | 0 | 0 |

Speed bonus is 0 for incorrect answers — no rushing reward without correctness.

**Edge case:** Time spent is capped at `par_time × 3` for the formula to prevent gaming via very slow submission.

---

### 1.3 StreakBonus

**Rule:** Applied once per qualifying session. Rewards consecutive daily practice.

```
StreakBonus(session) = min(current_streak_days × 2, 30)
```

| Streak | Bonus |
|---|---|
| 1 day | +2 |
| 3 days | +6 |
| 7 days | +14 |
| 10 days | +20 |
| 15+ days | +30 (capped) |

A "qualifying session" = at least 3 problems answered in a calendar day (user's local timezone). Only one session per day counts toward the streak bonus.

---

### 1.4 HardBonus

**Rule:** Extra points for correctly solving high-difficulty problems, stacking with BasePoints.

```
HardBonus(problem) =
  correct && difficulty == 4 ? +3
  correct && difficulty == 5 ? +7
  else 0
```

This makes a correct difficulty-5 answer worth 17 base points (10 + 7) before speed.

**Rationale:** Hard problems require more skill and time. The bonus compensates for lower volume of high-difficulty problems in a session.

---

### 1.5 HintPenalty

**Rule:** Using hints reduces points earned per problem. Minimum contribution per problem is 0 (hints can eliminate earned points but not create a negative).

```
hint_penalty = [0, 1, 3, 6]  # for 0, 1, 2, 3 hints used
problem_contribution = max(0, BasePoints + SpeedBonus + HardBonus - hint_penalty[hints_used])
```

| Hints Used | Penalty | Effect on 10-point correct answer |
|---|---|---|
| 0 | 0 | 10 pts |
| 1 | -1 | 9 pts |
| 2 | -3 | 7 pts |
| 3 | -6 | 4 pts |

Hint penalty applies even if the answer is eventually correct. Viewing the full explanation after getting it wrong counts as 3 hints used.

---

### 1.6 Worked Example

**Scenario:** Student solves 5 problems in one session. 3-day streak. Grade: 9th.

| # | Difficulty | Correct | Time (s) | Hints | BasePoints | SpeedBonus | HardBonus | HintPenalty | Contribution |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 2 | ✓ | 20 | 0 | 10 | 5 | 0 | 0 | 15 |
| 2 | 3 | ✓ | 75 | 1 | 10 | 0 | 0 | 1 | 9 |
| 3 | 4 | ✗ | 55 | 2 | 0 | 0 | 0 | 0 | 0 |
| 4 | 5 | ✓ | 90 | 0 | 10 | 5 | 7 | 0 | 22 |
| 5 | 1 | ✓ | 25 | 0 | 10 | 2 | 0 | 0 | 12 |

Problem subtotal: 15 + 9 + 0 + 22 + 12 = **58 pts**
StreakBonus (3-day streak): **+6 pts**
**Session total: 64 pts**

---

### 1.7 Weekly Accumulation

Papaya Score accumulates across all sessions in a week (Monday–Sunday). A new week starts Monday 00:00 UTC (leaderboard reset runs Sunday 23:55–00:05 UTC window).

Wait — the product plan says reset is Sunday midnight. Let's clarify: **the week runs Monday through Sunday; the leaderboard resets at Sunday 23:59:59 UTC and the cron runs at Sunday 00:05 UTC (start of next week = start of Monday)**. The cron at `5 0 * * 0` fires Monday 00:05 UTC which is correct for Sunday-end reset.

---

## 2. Skill Model Algorithm

### 2.1 Overview

Each student has a per-topic skill estimate stored as `(mu, sigma)`:
- `mu` ∈ [0.01, 0.99] — estimated skill level (0 = no skill, 1 = mastery)
- `sigma` ∈ [0.05, 0.45] — uncertainty about the estimate

Initial state for all topics (before any attempts): `mu = 0.5, sigma = 0.30`

After the placement assessment, mu is seeded based on placement result:
- All wrong: `mu = 0.15`
- Mostly wrong: `mu = 0.30`
- Mixed: `mu = 0.50`
- Mostly right: `mu = 0.70`
- All right: `mu = 0.85`

---

### 2.2 Update Rule (Kalman Filter)

After each problem attempt, the skill estimate updates as follows:

```python
NOISE_VARIANCE = 0.04       # observation noise (σ_obs² = 0.2²)
DIFFICULTY_SCALE = 0.5      # how much difficulty mismatch amplifies update

# Map difficulty 1–5 to [0.1, 0.3, 0.5, 0.7, 0.9]
d = (difficulty - 1) * 0.2 + 0.1

# Kalman gain
K = (sigma ** 2) / (sigma ** 2 + NOISE_VARIANCE)

# Difficulty weighting: larger update when problem difficulty ≠ skill level
difficulty_factor = 1 + DIFFICULTY_SCALE * abs(d - mu)
K_adjusted = K * difficulty_factor

# Hint multiplier
HINT_MULTIPLIERS = [1.0, 0.7, 0.4, 0.2]
hint_factor = HINT_MULTIPLIERS[hints_used]  # hints_used in {0, 1, 2, 3}

# Observation: 1 if correct, 0 if incorrect
observation = 1 if correct else 0

# Update
update_direction = (observation - mu) * hint_factor
mu_new = mu + K_adjusted * update_direction
sigma_new = sqrt((1 - K_adjusted) * sigma ** 2)

# Clamp to valid range
mu_new = max(0.01, min(0.99, mu_new))
sigma_new = max(0.05, min(0.45, sigma_new))
```

---

### 2.3 Sample Trace

**Starting state:** `mu = 0.50, sigma = 0.30`

**Attempt 1:** Difficulty 3, Correct, 0 hints
```
d = 0.5
K = 0.09 / (0.09 + 0.04) = 0.692
difficulty_factor = 1 + 0.5 * |0.5 - 0.5| = 1.0
K_adjusted = 0.692
update_direction = (1 - 0.50) * 1.0 = 0.50
mu_new = 0.50 + 0.692 * 0.50 = 0.846
sigma_new = sqrt((1 - 0.692) * 0.09) = sqrt(0.0277) = 0.166
→ State: mu=0.85, sigma=0.17
```

**Attempt 2:** Difficulty 4, Correct, 2 hints
```
d = 0.7
K = 0.0289 / (0.0289 + 0.04) = 0.419
difficulty_factor = 1 + 0.5 * |0.7 - 0.85| = 1.075
K_adjusted = 0.419 * 1.075 = 0.450
hint_factor = 0.4
update_direction = (1 - 0.85) * 0.4 = 0.060
mu_new = 0.85 + 0.450 * 0.060 = 0.877
sigma_new = sqrt((1 - 0.450) * 0.0289) = sqrt(0.0159) = 0.126
→ State: mu=0.88, sigma=0.13
```

**Attempt 3:** Difficulty 5, Incorrect, 0 hints
```
d = 0.9
K = 0.0169 / (0.0169 + 0.04) = 0.297
difficulty_factor = 1 + 0.5 * |0.9 - 0.88| = 1.01
K_adjusted = 0.297 * 1.01 = 0.300
hint_factor = 1.0
update_direction = (0 - 0.88) * 1.0 = -0.88
mu_new = 0.88 + 0.300 * (-0.88) = 0.616
sigma_new = sqrt((1 - 0.300) * 0.0169) = sqrt(0.0118) = 0.109
→ State: mu=0.62, sigma=0.11
```

**Interpretation:** The student was confidently assessed near mastery (mu=0.85), failed a difficulty-5 problem, and was appropriately pulled back down to mu=0.62 with continued confidence (low sigma).

---

### 2.4 Product Spec Update Rules Mapping

The product plan specifies these qualitative rules. Here is how they map to the algorithm:

| Product Rule | Algorithmic Effect |
|---|---|
| Correct + no hints → skill moves up significantly | K_adjusted * 1.0 * (1 - mu) — full gain |
| Correct + hints → skill moves up slightly | K_adjusted * 0.2–0.7 * (1 - mu) — reduced gain |
| Incorrect then correct → skill stays flat | Two updates roughly cancel out over consecutive attempts |
| Incorrect + solution viewed → skill moves down slightly | K_adjusted * 1.0 * (0 - mu), solution view = hints_used=3 |

---

### 2.5 Problem Selection (70/20/10 Mix)

Given current `mu`, problems are selected by difficulty band:

```python
# Map mu back to difficulty band
target_difficulty = round(mu * 4 + 1)  # mu=0 → d=1, mu=1 → d=5

# 70% bucket: at-level
at_level = target_difficulty                    # may be clamped to [1,5]

# 20% bucket: one level above (stretch)
stretch = min(5, target_difficulty + 1)

# 10% bucket: one level below (fluency)
fluency = max(1, target_difficulty - 1)
```

If the library is exhausted at a difficulty level (user has seen all problems), the engine falls back to Claude generation before trying adjacent difficulty levels.

---

### 2.6 Mastery Definition

A topic is considered **mastered** when: `mu >= 0.85 AND sigma <= 0.15 AND attempts >= 10`

This requires both high skill estimate AND sufficient confidence (low uncertainty) over a meaningful sample. Too-easy mastery (high mu but few attempts) is prevented by the attempts gate.

**Mastery display in UI:** "Mastered" badge on the topic in the skill dashboard. Does not remove the topic from practice rotation — mastered topics still appear at 5% frequency to maintain retention.

---

### 2.7 Plateau Detection

A plateau is flagged when: `last 10 sessions on this topic show mu change < 0.03 total`

When plateau detected:
1. Increase the "stretch" bucket to 30% (reduce at-level to 60%) to push harder
2. After 3 more sessions still plateaued, surface a prompt: "Want to try related topics that might unlock this one?"

---

## 3. Leaderboard Rules

### 3.1 Weekly Cycle

- Week starts: Monday 00:00 UTC
- Week ends: Sunday 23:59:59 UTC
- Cron runs: Monday 00:05 UTC (finalizes ranks for the ended week, initializes new week)

### 3.2 Rank Computation

During the week: ranks are read live from Redis sorted set `leaderboard:{YYYY-WW}`.

End of week: cron writes final `rank_global` and `rank_grade` to the `leaderboard_scores` table.

### 3.3 Tie-Breaking

When two users have equal `papaya_score`:
1. Higher `problems_correct` wins
2. If still tied: earlier first-problem-of-week timestamp wins
3. If still tied: alphabetical by `display_name`

### 3.4 Grade-Band Filtering

Global leaderboard defaults to showing the user's own grade band. Options:
- `k2` — Grades K–2
- `3-5` — Grades 3–5
- `6-8` — Grades 6–8
- `9-12` — Grades 9–12
- `all` — No filter (opt-in)

Grade band is set from `users.grade_level`. If not set, user sees the `all` board.

---

## 4. Streak Logic

### 4.1 What Counts

A day "counts" toward a streak if the user completes at least one qualifying session (≥3 problems answered) within the calendar day in their local timezone.

The user's timezone is stored in `users.timezone` (set from browser on first session, updateable in settings).

### 4.2 Streak Update

Run at session end (or within 5 minutes of session start if session is abandoned):

```python
today = date.today_in(user.timezone)
yesterday = today - 1 day

if last_practice_date == today:
    pass  # already counted today, no change

elif last_practice_date == yesterday:
    current_streak += 1
    longest_streak = max(longest_streak, current_streak)
    last_practice_date = today

else:
    # streak broken
    current_streak = 1
    last_practice_date = today

longest_streak = max(longest_streak, current_streak)
```

### 4.3 Streak Freeze

Not in MVP. Post-MVP feature: freeze tokens allow skipping one day without breaking streak.

---

## 5. Edge Cases

| Scenario | Behavior |
|---|---|
| User skips a problem (closes session mid-problem) | Problem not recorded; no skill update |
| Network error during answer submission | Client retries up to 3x with exponential backoff; server is idempotent on `session_answer.id` |
| User submits same answer twice (double-tap) | Idempotent: second submission with same `session_answer.id` is a no-op |
| User has 0 attempts in a topic | mu=0.5, sigma=0.30 is returned; label shown as "Not yet practiced" |
| Problem has no stored hints | Hints generated on-demand via Claude; Hint 1 always available |
| Session expires in Redis before flush | On resume, session state rebuilt from `session_answers` rows in Postgres |
| Clock skew on time_spent | Cap applied server-side: `min(time_spent, par_time × 3)` |
| Difficulty of AI-generated problem unverified | Default to difficulty 3; model can refine after quality review |
