-- 게시판 수정 기능 — posts / comments 에 updated_at 컬럼 추가
--
-- 배경 (2026-07-27):
--   기존 게시판은 작성/삭제만 가능했고 수정이 없었다. 수정 기능을 추가하면서
--   "이 글이 나중에 고쳐졌다"는 사실을 화면에 (수정됨) 으로 표기하기 위해
--   updated_at 컬럼이 필요하다.
--
-- 정책 (기존 삭제 정책과 동일하게 유지):
--   - anon 에는 UPDATE 정책을 주지 않는다(기본 거부). 즉 이 마이그레이션은
--     RLS 정책을 새로 열지 않는다.
--   - 수정은 서버 라우트(app/api/board/*, service_role)가 PIN 을 sha256 으로
--     다시 해싱해 pin_hash 와 대조한 뒤에만 수행한다.
--   - pin_hash 가 NULL 인 글/댓글은 삭제와 마찬가지로 누구나 수정 가능(실습용).
--
-- NULL 의미:
--   updated_at IS NULL  → 한 번도 수정된 적 없음 (화면에 (수정됨) 미표기)
--   updated_at IS NOT NULL → 수정된 적 있음
--   그래서 기본값을 now() 로 주지 않는다. 기존 행도 NULL 로 남아
--   "수정 안 된 글"로 올바르게 취급된다.
--
-- ⚠️ 아직 적용 전. Supabase 에 반영하려면 이 파일을 실행해야 한다.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS updated_at timestamptz;

COMMENT ON COLUMN posts.updated_at IS
  '마지막 수정 시각. NULL 이면 작성 후 수정된 적 없음.';
COMMENT ON COLUMN comments.updated_at IS
  '마지막 수정 시각. NULL 이면 작성 후 수정된 적 없음.';

-- RLS 정책은 건드리지 않는다.
-- anon 에는 여전히 SELECT / INSERT 만 허용되며 UPDATE / DELETE 는 기본 거부다.
-- (수정·삭제는 service_role 서버 라우트 전용)
