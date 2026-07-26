-- 공용 게시판(board) — posts / comments 테이블 + RLS
--
-- 목적 (Fivemonkeys 대장 지시, 2026-07-25):
--   오프라인 스터디 참가자들이 각자의 자동화 상황을 서로 공유·소통하는
--   "하나의 공용 게시판". 모든 참가자가 같은 두 테이블(posts, comments)을
--   공유한다 — 각자 분리 DB 아님.
--
-- 인증 정책 (대장 지시): OAuth/이메일/소셜 로그인 전부 없음. 로그인 세션 개념
--   없이 글/댓글 작성 시 닉네임만 입력. 본인 글/댓글 삭제용으로 선택적 4자리
--   PIN만 둔다(pin_hash, nullable). PIN이 없으면 누구나 삭제 가능(실습용).
--
-- pin_hash 는 클라이언트에서 sha256(pin) hex 로 계산해 저장한다.
--   삭제는 anon 키로 직접 하지 않고 서버 라우트(app/api/board/*, service_role)
--   가 PIN 을 다시 sha256 해서 비교한 뒤에만 수행한다. 따라서 anon 에는
--   INSERT/SELECT 만 허용하고 DELETE 정책은 주지 않는다.
--
-- ⚠️ 실습용 낮은 보안 수준: 아래 SELECT 정책은 row 단위라 pin_hash 컬럼도
--   anon 키로 조회 가능하다. 4자리 PIN 의 sha256 은 사실상 브루트포스로 뚫린다.
--   실제 서비스라면 pin_hash 를 별도 테이블/컬럼권한으로 분리해야 한다.
--   현재는 "진입장벽 0" 우선이라 이 수준을 의도적으로 허용한다.

CREATE TABLE IF NOT EXISTS posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  nickname text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  pin_hash text
);

CREATE TABLE IF NOT EXISTS comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  content text NOT NULL,
  pin_hash text
);

-- 최신 글/댓글 정렬 및 게시글별 댓글 조회 최적화
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments (post_id, created_at);

-- ─── RLS ───
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 재적용 시 충돌 방지 (idempotent)
DROP POLICY IF EXISTS "anon can read posts" ON posts;
DROP POLICY IF EXISTS "anon can insert posts" ON posts;
DROP POLICY IF EXISTS "anon can read comments" ON comments;
DROP POLICY IF EXISTS "anon can insert comments" ON comments;

-- 공용 게시판이므로 anon 누구나 읽고 쓸 수 있다.
CREATE POLICY "anon can read posts"
  ON posts FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert posts"
  ON posts FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can read comments"
  ON comments FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert comments"
  ON comments FOR INSERT TO anon WITH CHECK (true);

-- DELETE/UPDATE 정책은 anon 에 주지 않는다(기본 거부).
-- 삭제는 서버 라우트(service_role)가 PIN 검증 후에만 수행한다.
