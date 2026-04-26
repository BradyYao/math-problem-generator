-- Migration 002: Add answer_label to problems
-- Short context label displayed near the answer input (e.g. "x =" prefix or "apples" suffix)
ALTER TABLE problems ADD COLUMN IF NOT EXISTS answer_label text;
