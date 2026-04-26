-- Migration 005: Standards schema for curriculum alignment
-- Standards are identified by a code (e.g. "6.EE.A.1") and map to topics.

CREATE TABLE IF NOT EXISTS standards (
  id          text PRIMARY KEY,   -- e.g. "CCSS.6.EE.A.1"
  code        text NOT NULL UNIQUE, -- short code e.g. "6.EE.A.1"
  description text NOT NULL,
  grade_band  text CHECK (grade_band IN ('k2','3-5','6-8','9-12')),
  domain      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_standards_code ON standards(code);
CREATE INDEX IF NOT EXISTS idx_standards_grade_domain ON standards(grade_band, domain);

-- Junction table linking standards to topics
CREATE TABLE IF NOT EXISTS topic_standards (
  topic_id    text NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  standard_id text NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
  PRIMARY KEY (topic_id, standard_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_standards_standard ON topic_standards(standard_id);
