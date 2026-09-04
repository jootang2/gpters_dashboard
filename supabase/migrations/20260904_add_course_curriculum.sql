-- 과정 커리큘럼을 DB 로 옮겨 화면에서 편집할 수 있게 한다 (2026-09-04).
--
-- 배경: 커리큘럼이 app/courses/<slug>/page.tsx 안의 배열에 하드코딩돼 있어서
-- 문구 하나 고치려면 매번 코드 수정 + 재배포가 필요했다. 코스트코 과정처럼
-- 고객사와 조율하며 계속 바뀌는 커리큘럼에는 맞지 않아 테이블로 뺀다.
--
-- 코드의 기본 커리큘럼(lib/curriculum.ts 의 DEFAULT_CURRICULUM)은 그대로 둔다.
-- 이 테이블에 해당 과정 행이 하나도 없으면 화면은 코드 기본값을 그린다.
-- 즉 마이그레이션을 적용하지 않아도 사이트는 지금과 똑같이 동작하고,
-- 관리자가 처음 저장하는 순간부터 DB 값이 코드 기본값을 덮는다.

CREATE TABLE IF NOT EXISTS course_curriculum (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_slug text        NOT NULL,
  -- 화면에 그려지는 순서. 저장은 "그 과정 행 전체 삭제 후 재삽입"이라
  -- (course_slug, sort_order) 조합은 항상 유일하다.
  sort_order  integer     NOT NULL,
  time_label  text        NOT NULL,
  title       text        NOT NULL,
  -- 그 블록의 데이터 경계 태그(예: '사람이 만드는 층'). 없을 수 있다.
  scope       text,
  points      text[]      NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_slug, sort_order)
);

CREATE INDEX IF NOT EXISTS course_curriculum_slug_order_idx
  ON course_curriculum (course_slug, sort_order);

-- RLS: 커리큘럼은 공개 콘텐츠라 anon 읽기는 열어 둔다.
-- 쓰기 정책은 만들지 않는다 → anon 키로는 절대 수정할 수 없고,
-- 수정은 app/api/admin/curriculum(service_role + requireAdminUser)로만 가능하다.
-- (supabase/rls-policies.sql 의 dashboard_config 와 같은 방침)
ALTER TABLE course_curriculum ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon can read course curriculum" ON course_curriculum;

CREATE POLICY "anon can read course curriculum"
  ON course_curriculum
  FOR SELECT
  TO anon
  USING (true);
