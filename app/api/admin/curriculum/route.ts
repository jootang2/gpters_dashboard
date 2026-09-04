import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Admin-only: replaces a course's whole curriculum.
//
// Whole-list replace (delete + insert) instead of per-row updates because the
// editor lets blocks be added, removed and reordered at once — diffing that
// row by row buys nothing here and makes ordering bugs easy. The list is a
// handful of rows, so a full rewrite is cheap.
//
// course_curriculum has no anon write policy (RLS), so this must go through
// the service_role client, gated by the same Supabase Auth session check the
// other admin routes use.

type IncomingBlock = {
  time?: unknown
  title?: unknown
  scope?: unknown
  points?: unknown
}

export async function PUT(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const courseSlug = body?.course_slug
  const blocks = body?.blocks

  if (typeof courseSlug !== 'string' || !courseSlug || !Array.isArray(blocks)) {
    return NextResponse.json(
      { error: 'Invalid body — expected { course_slug: string, blocks: [] }' },
      { status: 400 }
    )
  }

  // 시간·제목은 화면의 뼈대라 비어 있으면 받지 않는다. points 는 비어도 된다
  // (휴식 블록처럼 항목 없는 블록이 실제로 있다).
  const rows = []
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i] as IncomingBlock
    const time = typeof b?.time === 'string' ? b.time.trim() : ''
    const title = typeof b?.title === 'string' ? b.title.trim() : ''
    if (!time || !title) {
      return NextResponse.json(
        { error: `${i + 1}번째 블록의 시간과 제목은 비울 수 없습니다.` },
        { status: 400 }
      )
    }
    const scopeRaw = typeof b?.scope === 'string' ? b.scope.trim() : ''
    // 빈 줄을 버리지 않는다 — 문단 사이 여백도 작성자가 의도한 서식이다.
    // 줄 앞 공백(들여쓰기)도 그대로 둔다. 화면은 whitespace-pre-wrap 으로 그린다.
    const points = Array.isArray(b?.points)
      ? b.points.filter((p): p is string => typeof p === 'string')
      : []

    rows.push({
      course_slug: courseSlug,
      sort_order: i,
      time_label: time,
      title,
      scope: scopeRaw === '' ? null : scopeRaw,
      points,
    })
  }

  // 기존 행을 먼저 지운다. 삭제만 성공하고 삽입이 실패하면 그 과정의 커리큘럼이
  // 빈 상태가 되는데, 그때는 화면이 코드 기본값(lib/curriculum.ts)으로 떨어지므로
  // 페이지가 비지는 않는다 — 최악의 경우가 '기본값 복귀'라 허용 가능한 설계다.
  const { error: delError } = await supabaseAdmin
    .from('course_curriculum')
    .delete()
    .eq('course_slug', courseSlug)

  if (delError) {
    console.error('[api/admin/curriculum] delete error:', delError)
    return NextResponse.json({ error: delError.message }, { status: 500 })
  }

  if (rows.length > 0) {
    const { error: insError } = await supabaseAdmin.from('course_curriculum').insert(rows)
    if (insError) {
      console.error('[api/admin/curriculum] insert error:', insError)
      return NextResponse.json({ error: insError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, count: rows.length })
}
