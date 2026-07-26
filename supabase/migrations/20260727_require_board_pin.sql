-- 게시판 PIN 필수화 — 새 글/댓글은 pin_hash 없이 INSERT 할 수 없게 한다
--
-- 배경 (2026-07-27 대장 지시):
--   PIN 이 선택이라 pin_hash 가 NULL 인 글은 누구나 수정·삭제할 수 있었다.
--   삭제만 있을 때는 흔적이라도 남았지만, 수정 기능이 붙으면서 내용이 조용히
--   바뀔 수 있게 됐다. 그래서 "새로 쓰는 글·댓글"은 PIN 을 필수로 만든다.
--
-- ⚠️ 기존 데이터는 건드리지 않는다 (대장 결정):
--   현재 pin_hash 가 NULL 인 글 11건 / 댓글 7건은 그대로 둔다. 잠그지도, 지우지도
--   않는다. 지금처럼 PIN 없이 수정·삭제할 수 있는 상태를 유지한다.
--   → 그래서 CHECK 제약(NOT VALID 포함)을 쓰지 않는다.
--     CHECK 는 NOT VALID 로 걸어도 이후 그 행을 UPDATE 할 때 검사가 걸려서,
--     "기존 PIN 없는 글도 수정 가능" 이라는 요구사항을 깨뜨린다.
--     반면 아래 RLS 정책은 FOR INSERT 라 신규 INSERT 에만 적용되고
--     기존 행의 수정·삭제(서버 라우트 service_role 경유)에는 영향이 없다.
--
-- 적용 범위: anon 의 INSERT 정책만 좁힌다.
--   - SELECT 정책은 그대로 (읽기는 계속 누구나)
--   - UPDATE/DELETE 정책은 여전히 만들지 않는다 (기본 거부 유지)
--   - 수정·삭제는 계속 서버 라우트(app/api/board/*, service_role)가
--     PIN 을 재해싱 대조한 뒤에만 수행한다. service_role 은 RLS 를 우회하므로
--     이 변경의 영향을 받지 않는다.
--
-- pin_hash 형식: 클라이언트가 sha256(pin) 을 hex 로 만든 값 → 소문자 16진수 64자.
--   길이/형식까지 검사해 'x' 같은 쓰레기 값으로 우회하는 것을 막는다.
--
-- ⚠️ 아직 적용 전. 적용해야 서버(DB) 차원의 강제가 켜진다.
--    적용 전까지는 클라이언트 폼 검증만 동작하며, anon 키를 직접 쓰면 우회 가능하다.

-- ─── posts ───
DROP POLICY IF EXISTS "anon can insert posts" ON posts;

CREATE POLICY "anon can insert posts"
  ON posts FOR INSERT TO anon
  WITH CHECK (
    pin_hash IS NOT NULL
    AND pin_hash ~ '^[0-9a-f]{64}$'
  );

-- ─── comments ───
DROP POLICY IF EXISTS "anon can insert comments" ON comments;

CREATE POLICY "anon can insert comments"
  ON comments FOR INSERT TO anon
  WITH CHECK (
    pin_hash IS NOT NULL
    AND pin_hash ~ '^[0-9a-f]{64}$'
  );

-- 적용 후 확인용 (읽기 전용):
--   SELECT tablename, policyname, roles::text, cmd, with_check
--   FROM pg_policies
--   WHERE tablename IN ('posts','comments') ORDER BY tablename, cmd;
-- 기대: 테이블당 SELECT 1개 + INSERT 1개. UPDATE/DELETE 정책은 없어야 한다.
