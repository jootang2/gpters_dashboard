import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isMissingUpdatedAtError } from '@/lib/board'

export const dynamic = 'force-dynamic'

// PIN 대조 공통 로직 — 삭제(DELETE)와 수정(PATCH)이 같은 규칙을 쓴다.
//   - pin_hash 가 없으면(PIN 미설정) 누구나 가능(실습용).
//   - pin_hash 가 있으면 제공된 PIN 의 sha256 이 일치할 때만 가능.
// 반환값이 null 이면 통과, NextResponse 면 그대로 응답하면 된다.
function verifyPin(pinHash: string | null, pin: string | undefined): NextResponse | null {
  if (!pinHash) return null
  if (!pin) {
    return NextResponse.json({ error: 'PIN이 필요합니다.' }, { status: 401 })
  }
  const provided = createHash('sha256').update(pin).digest('hex')
  if (provided !== pinHash) {
    return NextResponse.json({ error: 'PIN이 일치하지 않습니다.' }, { status: 403 })
  }
  return null
}

// 게시글 수정 — 삭제와 동일한 보안 모델.
// anon 키로 직접 UPDATE 하지 않고(RLS 에 anon UPDATE 정책 없음), 이 서버 라우트가
// service_role 로 PIN 을 재해싱 대조한 뒤에만 수정한다.
//
// updated_at 컬럼은 아직 마이그레이션 적용 전일 수 있으므로, 포함해서 시도하고
// 컬럼이 없다는 에러가 나면 제외하고 재시도한다.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const body = await request.json().catch(() => null)
  const pin: string | undefined = body?.pin
  const title: unknown = body?.title
  const content: unknown = body?.content

  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: '제목을 입력해 주세요.' }, { status: 400 })
  }
  if (typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: '내용을 입력해 주세요.' }, { status: 400 })
  }
  if (title.length > 100) {
    return NextResponse.json({ error: '제목은 100자 이내로 입력해 주세요.' }, { status: 400 })
  }

  const { data: post, error: fetchError } = await supabaseAdmin
    .from('posts')
    .select('id, pin_hash')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    console.error('[api/board/posts/[id]] fetch error:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!post) {
    return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 })
  }

  const denied = verifyPin(post.pin_hash, pin)
  if (denied) return denied

  const patch = { title: title.trim(), content: content.trim() }

  // 1차: updated_at 포함해서 수정 시도
  let { error: updateError } = await supabaseAdmin
    .from('posts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)

  // updated_at 컬럼이 아직 없으면 그 필드만 빼고 재시도 (마이그레이션 미적용 대비)
  if (updateError && isMissingUpdatedAtError(updateError)) {
    console.warn('[api/board/posts/[id]] updated_at 컬럼 없음 — 해당 필드 제외하고 재시도')
    ;({ error: updateError } = await supabaseAdmin.from('posts').update(patch).eq('id', id))
  }

  if (updateError) {
    console.error('[api/board/posts/[id]] update error:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// 게시글 삭제 — anon 키로 직접 지우지 않고 이 서버 라우트를 통해서만 삭제한다.
// pin_hash 는 조회 시 클라이언트로 내려보내지 않으므로, PIN 대조는 반드시
// service_role(RLS 우회)로 서버에서만 이뤄진다.
//
// 규칙:
//   - 글에 pin_hash 가 없으면(PIN 미설정) 누구나 삭제 가능(실습용).
//   - pin_hash 가 있으면 body.pin 의 sha256 이 일치할 때만 삭제.
// 댓글은 FK ON DELETE CASCADE 로 함께 지워진다.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const body = await request.json().catch(() => null)
  const pin: string | undefined = body?.pin

  const { data: post, error: fetchError } = await supabaseAdmin
    .from('posts')
    .select('id, pin_hash')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    console.error('[api/board/posts/[id]] fetch error:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!post) {
    return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 })
  }

  const denied = verifyPin(post.pin_hash, pin)
  if (denied) return denied

  const { error: deleteError } = await supabaseAdmin.from('posts').delete().eq('id', id)
  if (deleteError) {
    console.error('[api/board/posts/[id]] delete error:', deleteError)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
