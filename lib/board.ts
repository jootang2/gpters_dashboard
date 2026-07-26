// 공용 게시판 공용 헬퍼.
//
// PIN 은 4자리 숫자(선택). 클라이언트에서 sha256(pin) hex 로 해싱해 저장하고,
// 삭제 시 서버 라우트(app/api/board/*)가 같은 방식으로 다시 해싱해 대조한다.
// 두 곳이 반드시 동일한 알고리즘(plain sha256 hex)을 써야 한다.

// 조회(select)할 때 pin_hash 를 절대 포함하지 않기 위한 컬럼 목록.
export const BOARD_POST_COLUMNS = 'id, created_at, nickname, title, content'
export const BOARD_COMMENT_COLUMNS = 'id, created_at, post_id, nickname, content'

// updated_at 을 포함한 버전.
// ⚠️ updated_at 컬럼은 supabase/migrations/20260727_add_board_updated_at.sql 로
//    추가되는데, 아직 적용 전일 수 있다. 컬럼이 없는 DB 에 이 목록으로 select 하면
//    PostgREST 가 에러를 내며 게시판 전체가 안 보이게 된다. 그래서 항상
//    selectWithOptionalUpdatedAt() 로 감싸서 "있으면 쓰고 없으면 빼고" 조회한다.
export const BOARD_POST_COLUMNS_WITH_UPDATED = `${BOARD_POST_COLUMNS}, updated_at`
export const BOARD_COMMENT_COLUMNS_WITH_UPDATED = `${BOARD_COMMENT_COLUMNS}, updated_at`

type SupabaseLikeError = { message?: string; code?: string } | null

// updated_at 컬럼이 아직 없어서 난 에러인지 판별.
// PostgREST: select 시 42703(undefined column), insert/update 시 PGRST204.
// 코드가 바뀌어도 잡히도록 메시지에 컬럼명이 있는지도 함께 본다.
export function isMissingUpdatedAtError(error: SupabaseLikeError): boolean {
  if (!error) return false
  if (error.code === '42703' || error.code === 'PGRST204') return true
  return (error.message ?? '').includes('updated_at')
}

/**
 * updated_at 포함으로 먼저 조회하고, 컬럼이 없어서 실패하면 제외하고 재시도한다.
 * 마이그레이션 적용 전/후 양쪽에서 게시판이 동작하게 하기 위한 방어 코드.
 *
 * @param run 컬럼 문자열을 받아 실제 supabase 쿼리를 실행하는 함수
 */
export async function selectWithOptionalUpdatedAt<T>(
  withUpdated: string,
  withoutUpdated: string,
  run: (columns: string) => PromiseLike<{ data: unknown; error: SupabaseLikeError }>
): Promise<{ data: T | null; error: SupabaseLikeError }> {
  const first = await run(withUpdated)
  if (!first.error) return { data: (first.data as T) ?? null, error: null }

  if (isMissingUpdatedAtError(first.error)) {
    const second = await run(withoutUpdated)
    return { data: (second.data as T) ?? null, error: second.error }
  }

  return { data: null, error: first.error }
}

// 브라우저 Web Crypto 로 sha256 hex 계산. (클라이언트 컴포넌트에서만 호출)
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// 4자리 숫자 검증. 빈 값은 "PIN 없음"으로 허용(선택 사항).
//
// ⚠️ 이 함수는 **수정·삭제 경로 전용**이다.
//    pin_hash 가 NULL 인 기존 글/댓글(마이그레이션 이전에 작성된 것)은
//    PIN 없이 수정·삭제할 수 있어야 하므로 빈 값을 허용해야 한다.
//    새 글/댓글 **작성** 경로에는 절대 쓰지 말고 isValidPin() 을 써라.
export function isValidPinOrEmpty(pin: string): boolean {
  return pin === '' || /^\d{4}$/.test(pin)
}

// 4자리 숫자 필수 검증. 빈 값을 허용하지 않는다.
//
// 새 글/댓글 **작성** 경로 전용 (2026-07-27 대장 지시: 작성 시 PIN 필수).
// PIN 이 없으면 그 글은 누구나 조용히 수정할 수 있게 되므로 작성 단계에서 막는다.
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

// PostgreSQL / PostgREST 의 RLS 위반(권한 거부) 에러인지 판별.
//
// supabase/migrations/20260727_require_board_pin.sql 을 적용하면 anon 의 INSERT
// 정책이 "pin_hash 가 있어야 함"으로 좁혀진다. 그때 PIN 없이 INSERT 를 시도하면
// 42501 이 떨어지므로, 일반 오류와 구분해 사용자에게 정확한 안내를 준다.
export function isRlsDeniedError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  if (error.code === '42501') return true
  return /row-level security|violates row-level/i.test(error.message ?? '')
}
