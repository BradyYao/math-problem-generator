export interface SkillState {
  user_id: string;
  topic_id: string;
  mu: number;          // skill estimate [0.01, 0.99]
  sigma: number;       // uncertainty [0.05, 0.45]
  attempts: number;
  correct: number;
  last_updated_at: string;
}

export interface SkillUpdate {
  topic_id: string;
  mu_before: number;
  sigma_before: number;
  mu_after: number;
  sigma_after: number;
  delta: number;
}

export interface TopicSkillSummary {
  topic_id: string;
  topic_name: string;
  mu: number;
  sigma: number;
  attempts: number;
  correct: number;
  mastered: boolean;
  grade_band: string;
  domain: string;
}
