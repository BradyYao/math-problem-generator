# Papaya Data Model

This document is the authoritative reference for Papaya's database schema, relationships, indexing strategy, and data lifecycle rules. The implementation lives in `lib/db/migrations/`.

**Database:** Neon (serverless PostgreSQL)
**Client:** `@neondatabase/serverless` HTTP driver (works in Vercel Edge Functions without connection pool issues)

---

## ER Diagram

```mermaid
erDiagram
    users {
        uuid id PK
        text clerk_id UK
        text guest_token UK
        text email UK
        text display_name
        text avatar_url
        smallint grade_level
        date date_of_birth
        boolean is_minor
        text timezone
        text goal_type
        date goal_target_date
        int goal_score_target
        timestamptz created_at
        timestamptz last_active_at
    }

    topics {
        text id PK
        text name
        text parent_id FK
        text grade_band
        text domain
        boolean sat_relevant
        boolean act_relevant
        boolean amc_relevant
        int sort_order
    }

    skill_states {
        uuid id PK
        uuid user_id FK
        text topic_id FK
        float8 mu
        float8 sigma
        int attempts
        int correct
        timestamptz last_updated_at
    }

    problems {
        uuid id PK
        text topic_id FK
        smallint difficulty
        text answer_type
        text stem_latex
        jsonb choices
        text correct_answer
        float8 tolerance
        text hint_1
        text hint_2
        text hint_3
        text explanation
        text source
        float8 quality_score
        timestamptz created_at
    }

    sessions {
        uuid id PK
        uuid user_id FK
        text mode
        text[] topic_ids
        timestamptz started_at
        timestamptz ended_at
        smallint time_budget_minutes
        int problems_delivered
        int problems_correct
        jsonb state
        boolean is_complete
        uuid challenge_id FK
    }

    session_answers {
        uuid id PK
        uuid session_id FK
        uuid problem_id FK
        text user_answer
        boolean is_correct
        int time_spent_seconds
        smallint hints_used
        float8 skill_mu_before
        float8 skill_mu_after
        timestamptz answered_at
    }

    challenges {
        uuid id PK
        text token UK
        uuid creator_id FK
        uuid[] problem_ids
        text topic_id FK
        timestamptz expires_at
        timestamptz created_at
    }

    challenge_participants {
        uuid id PK
        uuid challenge_id FK
        uuid user_id FK
        uuid session_id FK
        int score
        timestamptz completed_at
        int rank
    }

    friendships {
        uuid id PK
        uuid requester_id FK
        uuid addressee_id FK
        text status
        timestamptz created_at
    }

    leaderboard_scores {
        uuid id PK
        uuid user_id FK
        date week_start
        int papaya_score
        int problems_correct
        int streak_bonus
        int speed_bonus
        text grade_band
        int rank_global
        int rank_grade
    }

    streaks {
        uuid user_id PK FK
        int current_streak
        int longest_streak
        date last_practice_date
        smallint freeze_tokens
    }

    ai_generation_log {
        uuid id PK
        uuid user_id FK
        text topic_id FK
        text prompt_hash
        text model
        int input_tokens
        int output_tokens
        uuid problem_id FK
        timestamptz created_at
    }

    users ||--o{ skill_states : "has"
    users ||--o{ sessions : "starts"
    users ||--o{ challenges : "creates"
    users ||--o{ challenge_participants : "joins"
    users ||--o{ friendships : "requests/receives"
    users ||--o{ leaderboard_scores : "earns"
    users ||--|| streaks : "has"
    topics ||--o{ topics : "parent_of"
    topics ||--o{ skill_states : "tracked_by"
    topics ||--o{ problems : "contains"
    topics ||--o{ challenges : "scoped_to"
    problems ||--o{ session_answers : "answered_in"
    sessions ||--o{ session_answers : "contains"
    challenges ||--o{ challenge_participants : "has"
    sessions }o--|| challenges : "part_of"
```

---

## Table Definitions

### `users`

Stores all user accounts. Guests have `clerk_id = NULL` and a `guest_token` set. Authenticated users have `clerk_id` set and `guest_token = NULL` (after upgrade).

```sql
CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id          text UNIQUE,
  guest_token       text UNIQUE,
  email             text UNIQUE,
  display_name      text,
  avatar_url        text,
  grade_level       smallint CHECK (grade_level BETWEEN 1 AND 12),
  date_of_birth     date,
  is_minor          boolean GENERATED ALWAYS AS (
                      date_of_birth IS NOT NULL AND
                      EXTRACT(YEAR FROM AGE(date_of_birth)) < 13
                    ) STORED,
  timezone          text DEFAULT 'America/New_York',
  goal_type         text CHECK (goal_type IN ('sat','act','amc8','amc10','amc12','casual','topic','school')),
  goal_target_date  date,
  goal_score_target integer,
  created_at        timestamptz NOT NULL DEFAULT now(),
  last_active_at    timestamptz,

  CONSTRAINT users_either_clerk_or_guest CHECK (
    (clerk_id IS NOT NULL) OR (guest_token IS NOT NULL)
  )
);

CREATE INDEX idx_users_last_active ON users(last_active_at);
```

**COPPA note:** `is_minor = true` users must not have `email` stored. The application layer enforces this: when `date_of_birth` indicates under-13, the sign-up flow does not collect email.

---

### `topics`

Seeded from `content/topics/taxonomy.json`. Never modified by user actions.

```sql
CREATE TABLE topics (
  id            text PRIMARY KEY,   -- e.g. 'algebra.alg1.linear-equations'
  name          text NOT NULL,
  parent_id     text REFERENCES topics(id),
  grade_band    text NOT NULL CHECK (grade_band IN ('k2','3-5','6-8','9-12')),
  domain        text NOT NULL,
  sat_relevant  boolean NOT NULL DEFAULT false,
  act_relevant  boolean NOT NULL DEFAULT false,
  amc_relevant  boolean NOT NULL DEFAULT false,
  sort_order    integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_topics_parent ON topics(parent_id);
CREATE INDEX idx_topics_grade_domain ON topics(grade_band, domain);
```

---

### `skill_states`

One row per (user, topic) pair. Only exists after the user has attempted at least one problem in that topic. Before that, default values (`mu=0.5, sigma=0.3`) are used.

```sql
CREATE TABLE skill_states (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id        text NOT NULL REFERENCES topics(id),
  mu              float8 NOT NULL DEFAULT 0.5 CHECK (mu BETWEEN 0.01 AND 0.99),
  sigma           float8 NOT NULL DEFAULT 0.3 CHECK (sigma BETWEEN 0.05 AND 0.45),
  attempts        integer NOT NULL DEFAULT 0,
  correct         integer NOT NULL DEFAULT 0,
  last_updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, topic_id)
);

CREATE INDEX idx_skill_states_user ON skill_states(user_id);
CREATE INDEX idx_skill_states_topic ON skill_states(topic_id);
```

---

### `problems`

The problem library. Rows are inserted by the batch generation pipeline and by on-demand AI generation. Never modified by users.

```sql
CREATE TABLE problems (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id        text NOT NULL REFERENCES topics(id),
  difficulty      smallint NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  answer_type     text NOT NULL CHECK (answer_type IN ('mc','numeric','grid-in')),
  stem_latex      text NOT NULL,
  choices         jsonb,          -- [{id, label, latex}] for MC; null for numeric
  correct_answer  text NOT NULL,  -- MC: choice id ('a'|'b'|'c'|'d'); numeric: value string
  tolerance       float8,         -- ±tolerance for numeric answers; null for MC
  hint_1          text,
  hint_2          text,
  hint_3          text,
  explanation     text,
  source          text NOT NULL CHECK (source IN ('library','ai-generated','ai-verified')),
  quality_score   float8 NOT NULL DEFAULT 0.5 CHECK (quality_score BETWEEN 0 AND 1),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_problems_topic_difficulty ON problems(topic_id, difficulty);
CREATE INDEX idx_problems_quality ON problems(quality_score);
```

---

### `sessions`

Represents one practice session. The `state` JSONB column holds the full resumable session state (current problem index, pending skill deltas, etc.) and is the Redis flush target.

```sql
CREATE TABLE sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode                  text NOT NULL CHECK (mode IN ('practice','quickfire','assessment','challenge')),
  topic_ids             text[] NOT NULL DEFAULT '{}',
  started_at            timestamptz NOT NULL DEFAULT now(),
  ended_at              timestamptz,
  time_budget_minutes   smallint,
  problems_delivered    integer NOT NULL DEFAULT 0,
  problems_correct      integer NOT NULL DEFAULT 0,
  state                 jsonb NOT NULL DEFAULT '{}',
  is_complete           boolean NOT NULL DEFAULT false,
  challenge_id          uuid REFERENCES challenges(id)
);

CREATE INDEX idx_sessions_user ON sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_challenge ON sessions(challenge_id);
```

**Session state JSONB schema:**
```json
{
  "problem_queue": ["uuid", "uuid", ...],
  "current_index": 2,
  "pending_skill_deltas": [
    {"topic_id": "algebra.alg1.linear-equations", "mu_before": 0.5, "mu_after": 0.72}
  ],
  "hints_this_problem": 1,
  "timer_started_at": "ISO8601",
  "papaya_score_accumulator": 45
}
```

---

### `session_answers`

Individual problem attempts within a session. The authoritative record for skill model reconstruction.

```sql
CREATE TABLE session_answers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  problem_id          uuid NOT NULL REFERENCES problems(id),
  user_answer         text NOT NULL,
  is_correct          boolean NOT NULL,
  time_spent_seconds  integer NOT NULL DEFAULT 0,
  hints_used          smallint NOT NULL DEFAULT 0 CHECK (hints_used BETWEEN 0 AND 3),
  skill_mu_before     float8,
  skill_mu_after      float8,
  answered_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_answers_session ON session_answers(session_id);
CREATE INDEX idx_session_answers_problem ON session_answers(problem_id);
CREATE INDEX idx_session_answers_user_topic ON session_answers(session_id, answered_at DESC);
```

---

### `challenges`

Shareable challenge sessions. `problem_ids` is a fixed ordered array created at challenge creation time.

```sql
CREATE TABLE challenges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text UNIQUE NOT NULL,   -- nanoid(8), e.g. 'xK7mP2rQ'
  creator_id  uuid NOT NULL REFERENCES users(id),
  problem_ids uuid[] NOT NULL,        -- ordered fixed problem set
  topic_id    text NOT NULL REFERENCES topics(id),
  expires_at  timestamptz NOT NULL,   -- created_at + interval '48 hours'
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_challenges_token ON challenges(token);
CREATE INDEX idx_challenges_creator ON challenges(creator_id);
CREATE INDEX idx_challenges_expires ON challenges(expires_at);
```

---

### `challenge_participants`

One row per (challenge, user). Links to the session where the participant answered the challenge problems.

```sql
CREATE TABLE challenge_participants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id),
  session_id    uuid REFERENCES sessions(id),
  score         integer,
  completed_at  timestamptz,
  rank          smallint,

  UNIQUE (challenge_id, user_id)
);

CREATE INDEX idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_user ON challenge_participants(user_id);
```

---

### `friendships`

Bidirectional friendship graph using a directed edge model. A friendship exists when both `(A→B, accepted)` and `(B→A, accepted)` rows exist — actually, this uses the simpler single-row model: one row per pair, `requester_id` sent the request.

```sql
CREATE TABLE friendships (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        text NOT NULL CHECK (status IN ('pending','accepted','blocked')),
  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE INDEX idx_friendships_addressee ON friendships(addressee_id, status);
CREATE INDEX idx_friendships_requester ON friendships(requester_id, status);
```

**Query pattern for "get all friends of user X":**
```sql
SELECT CASE
  WHEN requester_id = $1 THEN addressee_id
  ELSE requester_id
END AS friend_id
FROM friendships
WHERE (requester_id = $1 OR addressee_id = $1)
  AND status = 'accepted';
```

---

### `leaderboard_scores`

Weekly Papaya Score snapshots. One row per (user, week). Created lazily on first score event in a new week.

```sql
CREATE TABLE leaderboard_scores (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start        date NOT NULL,    -- always a Monday
  papaya_score      integer NOT NULL DEFAULT 0,
  problems_correct  integer NOT NULL DEFAULT 0,
  streak_bonus      integer NOT NULL DEFAULT 0,
  speed_bonus       integer NOT NULL DEFAULT 0,
  grade_band        text,
  rank_global       integer,          -- set by Sunday cron
  rank_grade        integer,          -- set by Sunday cron

  UNIQUE (user_id, week_start)
);

CREATE INDEX idx_leaderboard_week_score ON leaderboard_scores(week_start, papaya_score DESC);
CREATE INDEX idx_leaderboard_week_grade ON leaderboard_scores(week_start, grade_band, papaya_score DESC);
```

---

### `streaks`

One row per user. Maintained by the session-end handler.

```sql
CREATE TABLE streaks (
  user_id             uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak      integer NOT NULL DEFAULT 0,
  longest_streak      integer NOT NULL DEFAULT 0,
  last_practice_date  date,
  freeze_tokens       smallint NOT NULL DEFAULT 0
);
```

---

### `ai_generation_log`

Audit trail for all Claude API calls that generate problems. Used for cost tracking, deduplication, and quality review.

```sql
CREATE TABLE ai_generation_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id),
  topic_id      text REFERENCES topics(id),
  prompt_hash   text NOT NULL,    -- sha256 of the generation prompt
  model         text NOT NULL,
  input_tokens  integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  problem_id    uuid REFERENCES problems(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_log_prompt_hash ON ai_generation_log(prompt_hash, created_at DESC);
CREATE INDEX idx_ai_log_user ON ai_generation_log(user_id, created_at DESC);
```

---

## Index Strategy Summary

| Table | Index | Reason |
|---|---|---|
| `users` | `last_active_at` | Active user queries, cleanup jobs |
| `topics` | `parent_id` | Tree traversal for rollup |
| `topics` | `(grade_band, domain)` | Topic picker filtering |
| `skill_states` | `user_id` | All topics for a user (dashboard) |
| `skill_states` | `topic_id` | Analytics per topic |
| `problems` | `(topic_id, difficulty)` | Problem selection (hottest query) |
| `sessions` | `(user_id, started_at DESC)` | Session history, resume |
| `session_answers` | `session_id` | Fetch all answers for a session |
| `challenge_participants` | `challenge_id` | All participants for results page |
| `friendships` | `(addressee_id, status)` | Pending requests for a user |
| `leaderboard_scores` | `(week_start, papaya_score DESC)` | Weekly rankings |
| `ai_generation_log` | `prompt_hash` | Deduplication |

---

## Redis Data Structures

Redis (Upstash) sits in front of Postgres for hot-path reads and writes.

### Skill State Cache
```
Key:   skill:{user_id}:{topic_id}
Value: JSON { mu, sigma, attempts, correct, last_updated_at }
TTL:   7 days (refreshed on each write)
```

### Session State
```
Key:   session:{session_id}:state
Value: JSON (mirrors sessions.state JSONB)
TTL:   7 days
```

### Leaderboard Sorted Set (current week)
```
Key:    leaderboard:{YYYY-WW}         # ISO week number
Type:   Sorted Set
Score:  papaya_score
Member: user_id

Operations:
  ZINCRBY leaderboard:{week} {points} {user_id}   # on each score event
  ZREVRANK leaderboard:{week} {user_id}            # get user's rank
  ZREVRANGE leaderboard:{week} 0 99 WITHSCORES     # top 100
TTL:  14 days (two weeks of history live in Redis)
```

### AI Rate Limiting
```
Key:   ai_rate:{user_id}
Value: integer counter
TTL:   24 hours
```

### Challenge Result Cache
```
Key:   challenge:{token}:results
Value: JSON (computed results, cached after both participants finish)
TTL:   48 hours (matches challenge expiry)
```

---

## COPPA Data Minimization Rules

For users where `is_minor = true`:

| Field | Rule |
|---|---|
| `email` | Must NOT be stored. Enforced at application layer during sign-up. |
| `display_name` | Allowed. Must be a username alias, not a real name. |
| `avatar_url` | Allowed. Must be a preset avatar (no photo uploads). |
| `date_of_birth` | Stored to compute `is_minor`. Not exposed via any public API. |
| `grade_level` | Allowed. |
| Leaderboard | Minor users: display_name shown only. No profile link. |
| Friends | Friends feature DISABLED for `is_minor = true`. |
| `session_answers` | Retained for skill model. Not exposed externally. |

All API routes that return user data must check `is_minor` and strip PII fields before responding for minor accounts.

---

## Guest-to-Account Migration Procedure

When a guest user completes Clerk sign-up:

1. Client passes `guest_token` in Clerk's `publicMetadata` during sign-up initiation.
2. Clerk fires the `user.created` webhook to `POST /api/auth/upgrade`.
3. The webhook handler:
   ```sql
   UPDATE users
   SET clerk_id = $new_clerk_id,
       email = $email,  -- if not minor
       guest_token = NULL,
       display_name = COALESCE(display_name, $clerk_display_name)
   WHERE guest_token = $guest_token
   RETURNING id;
   ```
4. If no row matches `guest_token`, a new user row is created (guest session was lost; clean start).
5. All `sessions`, `skill_states`, `session_answers`, and `streaks` rows referencing the `user_id` are automatically preserved (foreign key relationship).
6. Redis keys for `skill:{user_id}:*` and `session:{session_id}:*` remain valid (same `user_id`).

---

## Data Lifecycle

| Data | Retention | Archival |
|---|---|---|
| `users` | Indefinite while account active | 90-day soft-delete on account closure |
| `sessions` | Indefinite | Old sessions (>1 year, not the last 10) may be cold-archived |
| `session_answers` | Indefinite | Required for skill model reconstruction |
| `problems` | Indefinite | Soft-delete via `quality_score = 0` if problem found to be incorrect |
| `skill_states` | Indefinite | —  |
| `leaderboard_scores` | 2 years | — |
| `challenges` | 30 days after `expires_at` | Then deleted |
| `ai_generation_log` | 90 days | Used for cost audit; purged on schedule |
| `friendships` (blocked) | Indefinite | Block records retained even if one user deletes account |
| Guest users (abandoned) | 30 days after `last_active_at` | Then deleted with all associated data |
