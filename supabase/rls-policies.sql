-- Row Level Security for claude-code-study
--
-- Goal (Fivemonkeys 대장 지시, 2026-07-17):
--   1. survey_responses / dashboard_config 모두 RLS 활성화.
--   2. survey_responses: 익명(anon) 사용자는 INSERT만 가능(설문 제출은 계속 공개),
--      SELECT/UPDATE/DELETE는 전부 막는다 — 원본 응답은 admin만 봐야 함.
--   3. dashboard_config: anon에게 어떤 정책도 주지 않는다 — 아무도 anon key로
--      직접 읽거나 쓸 수 없다. 공개 대시보드는 이 테이블을 직접 읽지 않고
--      app/api/dashboard-summary(service_role)가 대신 읽어 집계만 반환한다.
--      admin의 노출 토글도 app/api/admin/dashboard-config(service_role,
--      admin 비밀번호 검증)를 통해서만 쓴다.
--
-- service_role 키는 Supabase 기본 설정상 RLS를 항상 우회하므로, 서버 라우트
-- (app/api/admin/*, app/api/dashboard-summary)는 이 정책과 무관하게 계속
-- 동작한다. 여기서는 anon 키(클라이언트에 노출된 NEXT_PUBLIC_SUPABASE_ANON_KEY)
-- 의 권한만 제한한다.

ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_config ENABLE ROW LEVEL SECURITY;

-- 기존에 동일 이름 정책이 있으면 재적용 시 충돌하지 않도록 먼저 제거(idempotent).
DROP POLICY IF EXISTS "anon can insert survey responses" ON survey_responses;

-- 설문 제출은 누구나 가능해야 하므로 INSERT만 허용. SELECT/UPDATE/DELETE
-- 정책이 없으므로 RLS 기본값(거부)이 적용되어 anon은 원본을 읽을 수 없다.
CREATE POLICY "anon can insert survey responses"
  ON survey_responses
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- dashboard_config: anon용 정책을 의도적으로 하나도 만들지 않는다.
-- (RLS 활성화 + 정책 없음 = anon에게 전체 거부)
