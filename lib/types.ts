export interface SurveyResponse {
  id?: string
  created_at?: string
  name: string
  job_role: string
  age_range?: string
  location?: string
  claude_code_experience: string
  ai_tools: string[]
  coding_experience: string
  study_goal: string
  automation_wish: string
  desired_outcome: string
  // Row-level admin toggle — separate from dashboard_config.is_visible
  // (which is per-field). When false, this participant's response is
  // excluded from /api/dashboard-summary aggregation. Defaults to true at
  // the DB level (supabase/migrations/20260717_add_include_in_dashboard.sql).
  include_in_dashboard?: boolean
}

export interface DashboardConfig {
  id?: string
  field_key: string
  is_visible: boolean
  display_label: string
}

export type ClaudeCodeExperience =
  | '처음 들어봄'
  | '들어봤지만 안 써봄'
  | '써봤음'

export type AiTool = 'ChatGPT' | 'Claude' | 'Gemini' | 'Copilot' | '없음' | '기타'

export type CodingExperience = '없음' | '조금' | '있음'

// ─── 공용 게시판 (board) ───
// posts / comments 는 하나의 공용 테이블을 전원이 공유한다.
// pin_hash 는 클라이언트에서 sha256(pin) hex 로 계산해 저장하며, 삭제 시
// 서버 라우트(app/api/board/*)가 다시 해싱해 대조한다. 목록/상세 조회 시엔
// 절대 pin_hash 를 select 하지 않는다(lib 의 BOARD_POST_COLUMNS 참고).

export interface Post {
  id: string
  created_at: string
  nickname: string
  title: string
  content: string
  // 마지막 수정 시각. 한 번도 수정 안 됐으면 null.
  // ⚠️ optional 인 이유: updated_at 컬럼 마이그레이션
  // (supabase/migrations/20260727_add_board_updated_at.sql)이 아직 적용 전일 수
  // 있어서, 컬럼이 없는 DB 에서도 게시판이 동작해야 한다.
  updated_at?: string | null
  // pin_hash 는 클라이언트로 내려오지 않는다(조회 시 select 제외).
}

export interface Comment {
  id: string
  created_at: string
  post_id: string
  nickname: string
  content: string
  // Post.updated_at 과 동일한 이유로 optional.
  updated_at?: string | null
}

export interface SurveyFormData {
  // Step 1
  name: string
  job_role: string
  age_range?: string
  location?: string
  // Step 2
  claude_code_experience: ClaudeCodeExperience | ''
  ai_tools: AiTool[]
  coding_experience: CodingExperience | ''
  // Step 3
  study_goal: string
  automation_wish: string
  desired_outcome: string
}
