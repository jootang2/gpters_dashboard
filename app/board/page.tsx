'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  BOARD_POST_COLUMNS,
  BOARD_POST_COLUMNS_WITH_UPDATED,
  selectWithOptionalUpdatedAt,
  hashPin,
  isValidPin,
  isRlsDeniedError,
} from '@/lib/board'
import type { Post } from '@/lib/types'

// updated_at 이 있고 created_at 과 유의미하게 차이날 때만 "수정됨" 으로 본다.
function wasEdited(item: { created_at: string; updated_at?: string | null }): boolean {
  if (!item.updated_at) return false
  return new Date(item.updated_at).getTime() - new Date(item.created_at).getTime() > 1000
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function BoardPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [nickname, setNickname] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const loadPosts = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    // updated_at 컬럼이 아직 없을 수도 있어 방어적으로 조회한다.
    const { data, error } = await selectWithOptionalUpdatedAt<Post[]>(
      BOARD_POST_COLUMNS_WITH_UPDATED,
      BOARD_POST_COLUMNS,
      (columns) =>
        supabase.from('posts').select(columns).order('created_at', { ascending: false })
    )
    if (error) {
      console.error('[Board] load error:', error)
      setLoadError('글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } else {
      setPosts(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const handleSubmit = async () => {
    setFormError('')
    if (!nickname.trim()) return setFormError('닉네임을 입력해 주세요.')
    if (!title.trim()) return setFormError('제목을 입력해 주세요.')
    if (!content.trim()) return setFormError('내용을 입력해 주세요.')
    // PIN 필수 (2026-07-27 대장 지시). 빈 값을 허용하는 isValidPinOrEmpty 를 쓰면 안 된다.
    if (!pin) return setFormError('PIN을 입력해 주세요. 나중에 글을 수정·삭제할 때 필요합니다.')
    if (!isValidPin(pin)) return setFormError('PIN은 숫자 4자리로 입력해 주세요.')

    setSubmitting(true)
    try {
      // PIN 이 필수이므로 pin_hash 는 항상 채워진다.
      const pin_hash = await hashPin(pin)
      const { error } = await supabase.from('posts').insert([
        { nickname: nickname.trim(), title: title.trim(), content: content.trim(), pin_hash },
      ])
      if (error) {
        console.error('[Board] insert error:', error)
        // RLS 로 PIN 없는 INSERT 가 거부된 경우를 구분해 안내
        setFormError(
          isRlsDeniedError(error)
            ? 'PIN이 없는 글은 등록할 수 없습니다. 숫자 4자리 PIN을 입력해 주세요.'
            : '글 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.'
        )
        return
      }
      // 초기화 후 목록 갱신
      setNickname('')
      setTitle('')
      setContent('')
      setPin('')
      setShowForm(false)
      await loadPosts()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-canvas text-fg px-6 py-16">
      <div className="w-full max-w-2xl mx-auto">
        {/* 상단 네비 */}
        <div className="mb-6">
          <Link
            href="/courses/gpters"
            className="inline-flex items-center gap-1.5 text-sm text-muted-2 hover:text-text-secondary transition-colors"
          >
            ← 스터디 홈
          </Link>
        </div>

        {/* 헤더 */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight mb-2">공유 게시판</h1>
            <p className="text-text-secondary text-sm">
              내 자동화 상황을 나누고, 서로의 사례에 댓글로 소통해요.
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm((v) => !v)
              setFormError('')
            }}
            className="shrink-0 px-5 py-2.5 rounded-full bg-brand hover:bg-accent-hover font-semibold text-sm transition-colors"
          >
            {showForm ? '닫기' : '✏️ 새 글'}
          </button>
        </div>

        {/* 작성 폼 */}
        {showForm && (
          <div className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-6 mb-8 space-y-4">
            <label className="block">
              <span className="text-sm text-muted mb-1 block">닉네임</span>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="원숭이1"
                maxLength={20}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent transition-colors"
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted mb-1 block">제목</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="이번 주 자동화 도전기"
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent transition-colors"
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted mb-1 block">내용</span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="무엇을 자동화하려 했고, 어디까지 됐는지 편하게 적어 주세요."
                rows={5}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent transition-colors resize-none"
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted mb-1 block">
                수정·삭제용 PIN{' '}
                <span className="text-accent text-xs">(필수 · 숫자 4자리)</span>
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="예: 1234"
                className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent transition-colors"
              />
              <span className="text-xs text-muted-2 mt-1.5 block leading-relaxed">
                🔑 PIN은 나중에 글을 수정하거나 지울 때 필요해요. 잊으면 되돌릴 수 없으니
                기억해두세요.
              </span>
            </label>

            {formError && (
              <p className="text-sm text-error bg-error/10 border border-error/20 rounded-lg px-4 py-3">
                {formError}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 rounded-full bg-brand hover:bg-accent-hover font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? '등록 중...' : '글 올리기'}
            </button>
          </div>
        )}

        {/* 기존 PIN 없던 글 안내 */}
        <div className="mb-6 rounded-2xl border border-accent/30 bg-brand/10 px-5 py-4">
          <p className="text-sm text-text-secondary leading-relaxed">
            🔑 <strong className="text-fg font-semibold">예전에 PIN 없이 올라온 글·댓글</strong>은
            PIN이 <strong className="text-accent font-semibold">1234</strong>로 설정돼 있어요.
            수정하거나 지울 때 <strong className="text-accent font-semibold">1234</strong>를
            입력해 주세요.
          </p>
          <p className="text-xs text-muted-2 mt-2 leading-relaxed">
            지금부터 새로 쓰는 글·댓글은 직접 정한 PIN 4자리가 필요합니다.
          </p>
        </div>

        {/* 목록 */}
        {loading ? (
          <p className="text-center text-muted-2 py-16">불러오는 중...</p>
        ) : loadError ? (
          <p className="text-center text-error py-16">{loadError}</p>
        ) : posts.length === 0 ? (
          <p className="text-center text-muted-2 py-16">
            아직 글이 없어요. 첫 글을 남겨 보세요!
          </p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/board/${post.id}`}
                className="block backdrop-blur-sm bg-surface border border-line rounded-2xl p-5 hover:bg-surface-strong transition-colors"
              >
                <p className="text-fg font-medium mb-2 truncate">{post.title}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-2">
                  <span className="text-accent">{post.nickname}</span>
                  <span>·</span>
                  <span>{formatDate(post.created_at)}</span>
                  {wasEdited(post) && (
                    <>
                      <span>·</span>
                      <span className="text-muted">(수정됨)</span>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
