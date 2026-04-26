-- Migration 003: User achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id  text NOT NULL,
  earned_at       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id, earned_at DESC);
