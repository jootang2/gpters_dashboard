CREATE TABLE IF NOT EXISTS survey_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  name text,
  job_role text,
  age_range text,
  location text,
  claude_code_experience text,
  ai_tools text[],
  coding_experience text,
  study_goal text,
  automation_wish text,
  desired_outcome text
);

CREATE TABLE IF NOT EXISTS dashboard_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  field_key text UNIQUE NOT NULL,
  is_visible boolean DEFAULT true,
  display_label text
);

INSERT INTO dashboard_config (field_key, is_visible, display_label) VALUES
  ('claude_code_experience', true, 'Claude Code 경험'),
  ('coding_experience', true, '코딩 경험'),
  ('ai_tools', true, '사용 AI 도구'),
  ('age_range', true, '나이대'),
  ('location', true, '사는 곳'),
  ('study_goal', false, '스터디 목표'),
  ('automation_wish', false, '자동화 희망 업무'),
  ('desired_outcome', false, '원하는 결과물')
ON CONFLICT (field_key) DO NOTHING;
