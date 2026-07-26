-- 기존 PIN 없는 글·댓글에 PIN "1234" 설정 (백필)
--
-- 배경 (2026-07-27 대장 결정):
--   PIN 이 선택이던 시절에 작성된 글·댓글은 pin_hash 가 NULL 이라 누구나
--   수정·삭제할 수 있다. 작성 단계는 PIN 필수로 막았지만, 이미 쌓인 행들은
--   여전히 무방비다. 그래서 이 행들에 공용 PIN "1234" 를 채워 넣는다.
--
-- ⚠️ 이 마이그레이션 최대 위험: 이미 PIN 이 있는 행을 덮어쓰는 것.
--    그러면 그 글을 쓴 사람이 자기 PIN 으로 영영 수정·삭제하지 못한다.
--    → 그래서 UPDATE 에 반드시 `WHERE pin_hash IS NULL` 을 건다.
--      이 조건을 빼거나 고치지 마라.
--
-- 실행 시점 기준 영향 범위 (2026-07-27 확인):
--    posts    : 전체 11건 중 pin_hash IS NULL 6건 → 이 6건만 변경, 나머지 5건 보존
--    comments : 전체  7건 중 pin_hash IS NULL 4건 → 이 4건만 변경, 나머지 3건 보존
--
-- 해시 값 근거:
--   아래 상수는 sha256('1234') 의 hex 소문자 표현이다.
--   lib/board.ts 의 hashPin() (Web Crypto sha256 → hex, 소문자) 과
--   app/api/board/*/route.ts 의 createHash('sha256').digest('hex') 양쪽에서
--   동일한 값이 나오는 것을 계산해 대조했다.
--     03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
--   64자 소문자 hex 이므로 20260727_require_board_pin.sql 의
--   정규식 '^[0-9a-f]{64}$' 도 통과한다.
--
-- 실행 순서 (권장): 이 파일 먼저 → 그다음 20260727_require_board_pin.sql
--   순서가 바뀌어도 안전하다. require_board_pin 은 anon 의 INSERT 정책만
--   건드리는데, 이 UPDATE 는 SQL Editor(postgres 롤)에서 실행되어 RLS 를
--   우회하므로 정책이 먼저 적용돼 있어도 이 UPDATE 는 정상 수행된다.
--   다만 "모든 행이 PIN 을 갖는 상태"를 먼저 만드는 편이 이해하기 쉽다.
--
-- ⚠️ 아직 적용 전. 대장이 Supabase SQL Editor 에서 실행한다.

-- ─── ① 실행 전 확인 (변경 대상 건수) ───
--   기대: posts 6 / comments 4
SELECT 'posts'    AS table_name, count(*) AS will_update FROM posts    WHERE pin_hash IS NULL
UNION ALL
SELECT 'comments' AS table_name, count(*) AS will_update FROM comments WHERE pin_hash IS NULL;

-- ─── ② 백필 실행 ───
-- WHERE 절 필수 — 기존 PIN 이 있는 행은 절대 건드리지 않는다.
UPDATE posts
   SET pin_hash = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'
 WHERE pin_hash IS NULL;

UPDATE comments
   SET pin_hash = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'
 WHERE pin_hash IS NULL;

-- ─── ③ 실행 후 확인 ───
--   기대: null_left 가 posts 0 / comments 0
--         total 은 실행 전과 동일 (posts 11 / comments 7) — 행이 늘거나 줄면 안 된다
SELECT 'posts' AS table_name,
       count(*)                                   AS total,
       count(*) FILTER (WHERE pin_hash IS NULL)   AS null_left,
       count(*) FILTER (WHERE pin_hash = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4') AS pin_1234
  FROM posts
UNION ALL
SELECT 'comments',
       count(*),
       count(*) FILTER (WHERE pin_hash IS NULL),
       count(*) FILTER (WHERE pin_hash = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4')
  FROM comments;

-- 참고: updated_at 은 일부러 건드리지 않는다.
--   이건 사용자가 내용을 고친 게 아니라 운영상 PIN 을 채운 것이므로,
--   화면에 "(수정됨)" 이 뜨면 오해를 준다.
