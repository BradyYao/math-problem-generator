-- Migration 004: Add problem_format column to problems
-- Tracks whether a problem is a word problem, pure equation, or diagram-based
ALTER TABLE problems ADD COLUMN IF NOT EXISTS problem_format text
  CHECK (problem_format IN ('word_problem', 'equation', 'diagram_based'));

CREATE INDEX IF NOT EXISTS idx_problems_format ON problems(problem_format) WHERE problem_format IS NOT NULL;
