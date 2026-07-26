import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isMissingUpdatedAtError } from '@/lib/board'

export const dynamic = 'force-dynamic'

// PIN 대조 공통 로직 — 게시글 라우트와 동일한 규칙.
//   - pin_hash 가 없으면 누구나 가능(실습용).
//   - pin_hash 가 있으면 제공된 PIN 의 sha256 이 일치할 때만 가능.
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

// 댓글 수정 — 삭제와 동일한 PIN 대조 규칙.
// anon 키로 직접 UPDATE 하지 않고 service_role 서버 라우트에서만 수정한다.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const body = await request.json().catch(() => null)
  const pin: string | undefined = body?.pin
  const content: unknown = body?.content

  if (typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: '댓글 내용을 입력해 주세요.' }, { status: 400 })
  }

  const { data: comment, error: fetchError } = await supabaseAdmin
    .from('comments')
    .select('id, pin_hash')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    console.error('[api/board/comments/[id]] fetch error:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!comment) {
    return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 })
  }

  const denied = verifyPin(comment.pin_hash, pin)
  if (denied) return denied

  const patch = { content: content.trim() }

  // 1차: updated_at 포함해서 수정 시도
  let { error: updateError } = await supabaseAdmin
    .from('comments')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)

  // updated_at 컬럼이 아직 없으면 그 필드만 빼고 재시도 (마이그레이션 미적용 대비)
  if (updateError && isMissingUpdatedAtError(updateError)) {
    console.warn('[api/board/comments/[id]] updated_at 컬럼 없음 — 해당 필드 제외하고 재시도')
    ;({ error: updateError } = await supabaseAdmin.from('comments').update(patch).eq('id', id))
  }

  if (updateError) {
    console.error('[api/board/comments/[id]] update error:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// 댓글 삭제 — 게시글 삭제와 동일한 PIN 대조 규칙.
//   - pin_hash 가 없으면 누구나 삭제 가능(실습용).
//   - pin_hash 가 있으면 body.pin 의 sha256 이 일치할 때만 삭제.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const body = await request.json().catch(() => null)
  const pin: string | undefined = body?.pin

  const { data: comment, error: fetchError } = await supabaseAdmin
    .from('comments')
    .select('id, pin_hash')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    console.error('[api/board/comments/[id]] fetch error:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!comment) {
    return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 })
  }

  const denied = verifyPin(comment.pin_hash, pin)
  if (denied) return denied

  const { error: deleteError } = await supabaseAdmin.from('comments').delete().eq('id', id)
  if (deleteError) {
    console.error('[api/board/comments/[id]] delete error:', deleteError)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
