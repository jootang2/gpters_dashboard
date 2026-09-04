'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import type { CurriculumBlock } from '@/lib/curriculum'

// 커리큘럼 표시 + 관리자 인라인 편집.
//
// 읽기는 서버에서 끝내고(initialBlocks 로 받음) 이 컴포넌트는 편집만 담당한다.
// 로그인 여부는 app/admin/page.tsx 와 같은 방식으로 브라우저 Supabase 클라이언트가
// 확인한다. 세션이 쿠키에 있어서 같은 출처 fetch 가 자동으로 세션을 싣고 가므로
// 저장 요청에 따로 헤더를 붙이지 않는다.
//
// 비로그인 방문자에게는 편집 버튼 자체를 보여주지 않는다 — 눌러봐야 막히는
// 버튼을 굳이 노출할 이유가 없다.

/** 편집 폼에서 다루는 형태. points 는 줄바꿈 구분 문자열로 펼쳐 둔다. */
type DraftBlock = {
  time: string
  title: string
  scope: string
  pointsText: string
}

function toDraft(blocks: CurriculumBlock[]): DraftBlock[] {
  return blocks.map((b) => ({
    time: b.time,
    title: b.title,
    scope: b.scope ?? '',
    pointsText: b.points.join('\n'),
  }))
}

function fromDraft(drafts: DraftBlock[]): CurriculumBlock[] {
  return drafts.map((d) => ({
    time: d.time.trim(),
    title: d.title.trim(),
    scope: d.scope.trim() === '' ? undefined : d.scope.trim(),
    // 상세 내용은 입력한 그대로 저장한다 — 빈 줄(문단 사이 여백)도,
    // 줄 앞 공백(들여쓰기)도 손대지 않는다. 한 줄이 배열 한 칸이다.
    points: d.pointsText.split('\n'),
  }))
}

export default function CurriculumSection({
  courseSlug,
  initialBlocks,
}: {
  courseSlug: string
  initialBlocks: CurriculumBlock[]
}) {
  const [supabase] = useState(() => createBrowserSupabaseClient())
  const [user, setUser] = useState<User | null>(null)

  const [blocks, setBlocks] = useState<CurriculumBlock[]>(initialBlocks)
  const [editing, setEditing] = useState(false)
  const [drafts, setDrafts] = useState<DraftBlock[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null)
    )
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  function startEditing() {
    setDrafts(toDraft(blocks))
    setError('')
    setEditing(true)
  }

  function updateDraft(index: number, patch: Partial<DraftBlock>) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  function addBlock() {
    setDrafts((prev) => [...prev, { time: '', title: '', scope: '', pointsText: '' }])
  }

  function removeBlock(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index))
  }

  function moveBlock(index: number, dir: -1 | 1) {
    setDrafts((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function save() {
    setSaving(true)
    setError('')
    const next = fromDraft(drafts)
    try {
      const res = await fetch('/api/admin/curriculum', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_slug: courseSlug, blocks: next }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setError(json?.error ?? `저장 실패 (${res.status})`)
        setSaving(false)
        return
      }
      setBlocks(next)
      setEditing(false)
    } catch (err) {
      console.error('[curriculum] save error:', err)
      setError('저장 중 오류가 발생했습니다.')
    }
    setSaving(false)
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent transition-colors'

  return (
    <>
      <section className="px-6 pb-20 max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold tracking-tight mb-8 text-fg">커리큘럼</h2>

        {error && (
          <p className="mb-6 text-sm text-error bg-error/10 border border-error/20 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {!editing && (
          <div className="space-y-4">
            {blocks.map((b, i) => (
              <div
                key={`${b.time}-${i}`}
                className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="text-xs text-accent font-medium">{b.time}</span>
                  {b.scope && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-strong border border-line text-muted">
                      {b.scope}
                    </span>
                  )}
                </div>
                <p className="text-fg font-medium mb-4">{b.title}</p>
                {b.points.length > 0 && (
                  /*
                    whitespace-pre-wrap: 줄 앞 공백(들여쓰기)과 빈 줄을 HTML 이
                    접어버리지 않게 한다. 목록이 아니라 '입력한 텍스트 그대로'를
                    보여주는 것이라 ul/li 대신 한 덩어리 텍스트로 그린다.
                  */
                  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                    {b.points.join('\n')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {editing && (
          <div className="space-y-4">
            {drafts.map((d, i) => (
              <div
                key={i}
                className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-6 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted">{i + 1}번째 블록</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveBlock(i, -1)}
                      disabled={i === 0}
                      className="text-xs px-2 py-1 rounded-full border border-line text-muted hover:bg-surface-strong transition-colors disabled:opacity-30"
                      aria-label="위로"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(i, 1)}
                      disabled={i === drafts.length - 1}
                      className="text-xs px-2 py-1 rounded-full border border-line text-muted hover:bg-surface-strong transition-colors disabled:opacity-30"
                      aria-label="아래로"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(i)}
                      className="text-xs px-2 py-1 rounded-full border border-error/30 text-error hover:bg-error/10 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                <input
                  value={d.time}
                  onChange={(e) => updateDraft(i, { time: e.target.value })}
                  placeholder="시간 (예: 0:00 – 0:20)"
                  className={inputClass}
                />
                <input
                  value={d.title}
                  onChange={(e) => updateDraft(i, { title: e.target.value })}
                  placeholder="제목 (예: 1부 · 데이터 플로우 파악)"
                  className={inputClass}
                />
                <input
                  value={d.scope}
                  onChange={(e) => updateDraft(i, { scope: e.target.value })}
                  placeholder="태그 (비워도 됩니다)"
                  className={inputClass}
                />
                <textarea
                  value={d.pointsText}
                  onChange={(e) => updateDraft(i, { pointsText: e.target.value })}
                  placeholder="상세 내용 — 한 줄에 하나씩"
                  rows={Math.max(3, d.pointsText.split('\n').length)}
                  className={`${inputClass} resize-y`}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={addBlock}
              className="w-full py-3 rounded-full border border-line border-dashed text-muted hover:bg-surface-strong transition-colors text-sm"
            >
              + 블록 추가
            </button>
          </div>
        )}
      </section>

      {/* 우측 하단 플로팅 편집 버튼 — 로그인한 관리자에게만 보인다 */}
      {user && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
          {!editing && (
            <button
              type="button"
              onClick={startEditing}
              className="px-5 py-3 rounded-full bg-brand hover:bg-accent-hover text-sm font-semibold transition-colors shadow-lg shadow-brand/25"
            >
              ✏️ 편집
            </button>
          )}
          {editing && (
            <>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="px-5 py-3 rounded-full bg-surface border border-line text-text-secondary hover:bg-surface-strong text-sm font-medium transition-colors disabled:opacity-40"
              >
                취소
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="px-5 py-3 rounded-full bg-brand hover:bg-accent-hover text-sm font-semibold transition-colors shadow-lg shadow-brand/25 disabled:opacity-40"
              >
                {saving ? '저장 중…' : '저장'}
              </button>
            </>
          )}
        </div>
      )}

      {/* 비로그인 상태에서는 관리자 로그인으로 가는 조용한 통로만 둔다 */}
      {!user && (
        <Link
          href="/admin"
          className="fixed bottom-6 right-6 z-40 text-xs text-muted-2 hover:text-muted transition-colors"
        >
          관리자
        </Link>
      )}
    </>
  )
}
