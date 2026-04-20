-- Migration 001: Initial schema
-- Run with: psql $DATABASE_URL -f lib/db/migrations/001_initial_schema.sql

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TOPICS (seeded from taxonomy.json — never user-generated)
-- ============================================================
CREATE TABLE IF NOT EXISTS topics (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  parent_id     text REFERENCES topics(id),
  grade_band    text NOT NULL CHECK (grade_band IN ('k2','3-5','6-8','9-12')),
  domain        text NOT NULL,
  sat_relevant  boolean NOT NULL DEFAULT false,
  act_relevant  boolean NOT NULL DEFAULT false,
  amc_relevant  boolean NOT NULL DEFAULT false,
  sort_order    integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_topics_parent ON topics(parent_id);
CREATE INDEX IF NOT EXISTS idx_topics_grade_domain ON topics(grade_band, domain);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id          text UNIQUE,
  guest_token       text UNIQUE,
  email             text UNIQUE,
  display_name      text,
  avatar_url        text,
  grade_level       smallint CHECK (grade_level BETWEEN 1 AND 12),
  date_of_birth     date,
  is_minor          boolean NOT NULL DEFAULT false,
  timezone          text NOT NULL DEFAULT 'America/New_York',
  goal_type         text CHECK (goal_type IN ('sat','act','amc8','amc10','amc12','casual','topic','school')),
  goal_target_date  date,
  goal_score_target integer,
  created_at        timestamptz NOT NULL DEFAULT now(),
  last_active_at    timestamptz,

  CONSTRAINT users_either_clerk_or_guest CHECK (
    (clerk_id IS NOT NULL) OR (guest_token IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);

-- ============================================================
-- SKILL STATES (per user per topic)
-- ============================================================
CREATE TABLE IF NOT EXISTS skill_states (
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

CREATE INDEX IF NOT EXISTS idx_skill_states_user ON skill_states(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_states_topic ON skill_states(topic_id);

-- ============================================================
-- PROBLEMS (library + AI-generated)
-- ============================================================
CREATE TABLE IF NOT EXISTS problems (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id        text NOT NULL REFERENCES topics(id),
  difficulty      smallint NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  answer_type     text NOT NULL CHECK (answer_type IN ('mc','numeric','grid-in')),
  stem_latex      text NOT NULL,
  choices         jsonb,
  correct_answer  text NOT NULL,
  tolerance       float8,
  hint_1          text,
  hint_2          text,
  hint_3          text,
  explanation     text,
  source          text NOT NULL CHECK (source IN ('library','ai-generated','ai-verified')),
  quality_score   float8 NOT NULL DEFAULT 0.5 CHECK (quality_score BETWEEN 0 AND 1),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_problems_topic_difficulty ON problems(topic_id, difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_quality ON problems(quality_score);

-- ============================================================
-- CHALLENGES (must exist before sessions references it)
-- ============================================================
CREATE TABLE IF NOT EXISTS challenges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text UNIQUE NOT NULL,
  creator_id  uuid NOT NULL REFERENCES users(id),
  problem_ids uuid[] NOT NULL DEFAULT '{}',
  topic_id    text NOT NULL REFERENCES topics(id),
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenges_token ON challenges(token);
CREATE INDEX IF NOT EXISTS idx_challenges_creator ON challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_challenges_expires ON challenges(expires_at);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
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

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_challenge ON sessions(challenge_id);

-- ============================================================
-- SESSION ANSWERS
-- ============================================================
CREATE TABLE IF NOT EXISTS session_answers (
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

CREATE INDEX IF NOT EXISTS idx_session_answers_session ON session_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_session_answers_problem ON session_answers(problem_id);

-- ============================================================
-- CHALLENGE PARTICIPANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS challenge_participants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id),
  session_id    uuid REFERENCES sessions(id),
  score         integer,
  completed_at  timestamptz,
  rank          smallint,

  UNIQUE (challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON challenge_participants(user_id);

-- ============================================================
-- FRIENDSHIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS friendships (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        text NOT NULL CHECK (status IN ('pending','accepted','blocked')),
  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id, status);

-- ============================================================
-- LEADERBOARD SCORES (weekly snapshots)
-- ============================================================
CREATE TABLE IF NOT EXISTS leaderboard_scores (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start        date NOT NULL,
  papaya_score      integer NOT NULL DEFAULT 0,
  problems_correct  integer NOT NULL DEFAULT 0,
  streak_bonus      integer NOT NULL DEFAULT 0,
  speed_bonus       integer NOT NULL DEFAULT 0,
  grade_band        text,
  rank_global       integer,
  rank_grade        integer,

  UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_week_score ON leaderboard_scores(week_start, papaya_score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_week_grade ON leaderboard_scores(week_start, grade_band, papaya_score DESC);

-- ============================================================
-- STREAKS
-- ============================================================
CREATE TABLE IF NOT EXISTS streaks (
  user_id             uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak      integer NOT NULL DEFAULT 0,
  longest_streak      integer NOT NULL DEFAULT 0,
  last_practice_date  date,
  freeze_tokens       smallint NOT NULL DEFAULT 0
);

-- ============================================================
-- AI GENERATION LOG (audit trail + dedup)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_generation_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id),
  topic_id      text REFERENCES topics(id),
  prompt_hash   text NOT NULL,
  model         text NOT NULL,
  input_tokens  integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  problem_id    uuid REFERENCES problems(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_log_prompt_hash ON ai_generation_log(prompt_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_log_user ON ai_generation_log(user_id, created_at DESC);
