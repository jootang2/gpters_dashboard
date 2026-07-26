'use client'

import { use, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  BOARD_POST_COLUMNS,
  BOARD_COMMENT_COLUMNS,
  BOARD_POST_COLUMNS_WITH_UPDATED,
  BOARD_COMMENT_COLUMNS_WITH_UPDATED,
  selectWithOptionalUpdatedAt,
  hashPin,
  isValidPin,
  isValidPinOrEmpty,
  isRlsDeniedError,
} from '@/lib/board'
import { LinkifiedText } from '@/lib/linkify'
import type { Post, Comment } from '@/lib/types'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// updated_at 이 있고 created_at 과 유의미하게 차이날 때만 "수정됨" 으로 본다.
// (마이그레이션 미적용 DB 에서는 updated_at 자체가 없으므로 자동으로 false)
function wasEdited(item: { created_at: string; updated_at?: string | null }): boolean {
  if (!item.updated_at) return false
  return new Date(item.updated_at).getTime() - new Date(item.created_at).getTime() > 1000
}

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // 댓글 작성
  const [cNickname, setCNickname] = useState('')
  const [cContent, setCContent] = useState('')
  const [cPin, setCPin] = useState('')
  const [cSubmitting, setCSubmitting] = useState(false)
  const [cError, setCError] = useState('')

  const [actionMsg, setActionMsg] = useState('')

  // ─── 글 수정 상태 ───
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editPin, setEditPin] = useState('')
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // ─── 댓글 수정 상태 (한 번에 하나만 편집) ───
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [cEditContent, setCEditContent] = useState('')
  const [cEditPin, setCEditPin] = useState('')
  const [cEditError, setCEditError] = useState('')
  const [cEditSaving, setCEditSaving] = useState(false)

  const loadPost = useCallback(async () => {
    // updated_at 컬럼이 아직 없을 수도 있어 방어적으로 조회한다.
    const { data, error } = await selectWithOptionalUpdatedAt<Post>(
      BOARD_POST_COLUMNS_WITH_UPDATED,
      BOARD_POST_COLUMNS,
      (columns) => supabase.from('posts').select(columns).eq('id', id).maybeSingle()
    )
    if (error) {
      console.error('[Board detail] post load error:', error)
    }
    if (!data) {
      setNotFound(true)
    } else {
      setPost(data)
    }
  }, [id])

  const loadComments = useCallback(async () => {
    const { data, error } = await selectWithOptionalUpdatedAt<Comment[]>(
      BOARD_COMMENT_COLUMNS_WITH_UPDATED,
      BOARD_COMMENT_COLUMNS,
      (columns) =>
        supabase
          .from('comments')
          .select(columns)
          .eq('post_id', id)
          .order('created_at', { ascending: true })
    )
    if (error) {
      console.error('[Board detail] comments load error:', error)
    } else {
      setComments(data ?? [])
    }
  }, [id])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      await Promise.all([loadPost(), loadComments()])
      setLoading(false)
    })()
  }, [loadPost, loadComments])

  const handleAddComment = async () => {
    setCError('')
    if (!cNickname.trim()) return setCError('닉네임을 입력해 주세요.')
    if (!cContent.trim()) return setCError('댓글 내용을 입력해 주세요.')
    // PIN 필수 (2026-07-27 대장 지시). 작성 경로에는 isValidPinOrEmpty 를 쓰지 않는다.
    if (!cPin) return setCError('PIN을 입력해 주세요. 나중에 댓글을 수정·삭제할 때 필요합니다.')
    if (!isValidPin(cPin)) return setCError('PIN은 숫자 4자리로 입력해 주세요.')

    setCSubmitting(true)
    try {
      // PIN 이 필수이므로 pin_hash 는 항상 채워진다.
      const pin_hash = await hashPin(cPin)
      const { error } = await supabase.from('comments').insert([
        { post_id: id, nickname: cNickname.trim(), content: cContent.trim(), pin_hash },
      ])
      if (error) {
        console.error('[Board detail] comment insert error:', error)
        setCError(
          isRlsDeniedError(error)
            ? 'PIN이 없는 댓글은 등록할 수 없습니다. 숫자 4자리 PIN을 입력해 주세요.'
            : '댓글 등록에 실패했습니다.'
        )
        return
      }
      setCContent('')
      setCPin('')
      await loadComments()
    } finally {
      setCSubmitting(false)
    }
  }

  // ─── 글 수정 ───
  const startEditPost = () => {
    if (!post) return
    setEditTitle(post.title)
    setEditContent(post.content)
    setEditPin('')
    setEditError('')
    setEditing(true)
    setActionMsg('')
  }

  const cancelEditPost = () => {
    setEditing(false)
    setEditError('')
  }

  const handleSavePost = async () => {
    setEditError('')
    if (!editTitle.trim()) return setEditError('제목을 입력해 주세요.')
    if (!editContent.trim()) return setEditError('내용을 입력해 주세요.')
    if (!isValidPinOrEmpty(editPin)) {
      return setEditError(
        'PIN은 숫자 4자리로 입력해 주세요. (PIN을 설정하지 않은 글이면 비워두세요)'
      )
    }

    setEditSaving(true)
    try {
      const res = await fetch(`/api/board/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          content: editContent.trim(),
          pin: editPin || undefined,
        }),
      })
      if (res.ok) {
        setEditing(false)
        setEditPin('')
        await loadPost()
      } else {
        const body = await res.json().catch(() => null)
        setEditError(body?.error ?? '수정에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      }
    } finally {
      setEditSaving(false)
    }
  }

  const handleDeletePost = async () => {
    setActionMsg('')
    const pin = window.prompt(
      '이 글을 삭제할까요?\n(PIN을 설정했다면 4자리 PIN을 입력하세요. 없으면 비워두고 확인)'
    )
    if (pin === null) return // 취소
    const res = await fetch(`/api/board/posts/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pin || undefined }),
    })
    if (res.ok) {
      router.push('/board')
    } else {
      const body = await res.json().catch(() => null)
      setActionMsg(body?.error ?? '삭제에 실패했습니다.')
    }
  }

  // ─── 댓글 수정 ───
  const startEditComment = (c: Comment) => {
    setEditingCommentId(c.id)
    setCEditContent(c.content)
    setCEditPin('')
    setCEditError('')
    setActionMsg('')
  }

  const cancelEditComment = () => {
    setEditingCommentId(null)
    setCEditError('')
  }

  const handleSaveComment = async (commentId: string) => {
    setCEditError('')
    if (!cEditContent.trim()) return setCEditError('댓글 내용을 입력해 주세요.')
    if (!isValidPinOrEmpty(cEditPin)) {
      return setCEditError('PIN은 숫자 4자리로 입력해 주세요. (PIN 미설정 댓글이면 비워두세요)')
    }

    setCEditSaving(true)
    try {
      const res = await fetch(`/api/board/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: cEditContent.trim(), pin: cEditPin || undefined }),
      })
      if (res.ok) {
        setEditingCommentId(null)
        setCEditPin('')
        await loadComments()
      } else {
        const body = await res.json().catch(() => null)
        setCEditError(body?.error ?? '수정에 실패했습니다.')
      }
    } finally {
      setCEditSaving(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    setActionMsg('')
    const pin = window.prompt(
      '이 댓글을 삭제할까요?\n(PIN을 설정했다면 4자리 PIN을 입력하세요. 없으면 비워두고 확인)'
    )
    if (pin === null) return
    const res = await fetch(`/api/board/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pin || undefined }),
    })
    if (res.ok) {
      await loadComments()
    } else {
      const body = await res.json().catch(() => null)
      setActionMsg(body?.error ?? '삭제에 실패했습니다.')
    }
  }

  return (
    <main className="min-h-screen bg-canvas text-fg px-6 py-16">
      <div className="w-full max-w-2xl mx-auto">
        {/* 상단 네비 */}
        <div className="mb-6">
          <Link
            href="/board"
            className="inline-flex items-center gap-1.5 text-sm text-muted-2 hover:text-text-secondary transition-colors"
          >
            ← 게시판
          </Link>
        </div>

        {loading ? (
          <p className="text-center text-muted-2 py-16">불러오는 중...</p>
        ) : notFound || !post ? (
          <div className="text-center py-16">
            <p className="text-muted-2 mb-4">글을 찾을 수 없습니다. 삭제되었을 수 있어요.</p>
            <Link href="/board" className="text-accent hover:text-accent-hover text-sm">
              게시판으로 돌아가기 →
            </Link>
          </div>
        ) : (
          <>
            {/* 글 본문 */}
            <article className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-8 mb-4">
              {editing ? (
                /* ── 수정 모드 ── */
                <div className="space-y-4">
                  <p className="text-xs text-accent">✏️ 글 수정 중</p>
                  <label className="block">
                    <span className="text-sm text-muted mb-1 block">제목</span>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      maxLength={100}
                      className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent transition-colors"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm text-muted mb-1 block">내용</span>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent transition-colors resize-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm text-muted mb-1 block">
                      PIN{' '}
                      <span className="text-muted-2 text-xs">(글 작성 때 설정했다면 입력)</span>
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editPin}
                      onChange={(e) => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="숫자 4자리 · PIN 미설정 글이면 비워두세요"
                      className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent transition-colors"
                    />
                  </label>

                  {editError && (
                    <p className="text-sm text-error bg-error/10 border border-error/20 rounded-lg px-4 py-3">
                      {editError}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleSavePost}
                      disabled={editSaving}
                      className="flex-1 py-3 rounded-full bg-brand hover:bg-accent-hover font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {editSaving ? '저장 중...' : '저장'}
                    </button>
                    <button
                      onClick={cancelEditPost}
                      disabled={editSaving}
                      className="flex-1 py-3 rounded-full bg-surface border border-line text-text-secondary hover:bg-surface-strong font-medium text-sm transition-colors disabled:opacity-40"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                /* ── 보기 모드 ── */
                <>
                  <h1 className="text-2xl font-semibold tracking-tight mb-3">{post.title}</h1>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-2 mb-6">
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
                  {/* 본문 URL 은 새 탭으로 열리는 링크로 자동 변환된다.
                      dangerouslySetInnerHTML 미사용 — lib/linkify.tsx 참고 */}
                  <div className="text-text-secondary leading-relaxed">
                    <LinkifiedText text={post.content} />
                  </div>

                  <div className="mt-6 pt-4 border-t border-line flex justify-end gap-4">
                    <button
                      onClick={startEditPost}
                      className="text-xs text-muted-2 hover:text-accent transition-colors"
                    >
                      글 수정
                    </button>
                    <button
                      onClick={handleDeletePost}
                      className="text-xs text-muted-2 hover:text-error transition-colors"
                    >
                      글 삭제
                    </button>
                  </div>
                </>
              )}
            </article>

            {/* PIN 정책 안내 */}
            <p className="text-xs text-muted-2 mb-8 px-1 leading-relaxed">
              🔑 수정·삭제하려면 글을 쓸 때 정한 PIN 4자리가 필요해요. 예전에 PIN 없이 올라온
              글·댓글은 PIN이 <span className="text-accent font-semibold">1234</span>로 설정돼
              있습니다.
            </p>

            {/* 댓글 */}
            <section>
              <h2 className="text-sm font-semibold text-muted mb-4">댓글 {comments.length}</h2>

              <div className="space-y-3 mb-6">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-2 py-4">첫 댓글을 남겨 응원해 주세요.</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="bg-surface border border-line rounded-xl p-4">
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-2 min-w-0">
                          <span className="text-accent">{c.nickname}</span>
                          <span>·</span>
                          <span>{formatDate(c.created_at)}</span>
                          {wasEdited(c) && (
                            <>
                              <span>·</span>
                              <span className="text-muted">(수정됨)</span>
                            </>
                          )}
                        </div>
                        {editingCommentId !== c.id && (
                          <div className="flex items-center gap-3 shrink-0">
                            <button
                              onClick={() => startEditComment(c)}
                              className="text-xs text-muted-2 hover:text-accent transition-colors"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="text-xs text-muted-2 hover:text-error transition-colors"
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>

                      {editingCommentId === c.id ? (
                        /* ── 댓글 수정 모드 ── */
                        <div className="space-y-3 mt-3">
                          <textarea
                            value={cEditContent}
                            onChange={(e) => setCEditContent(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent transition-colors resize-none text-sm"
                          />
                          <div className="flex flex-wrap gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={cEditPin}
                              onChange={(e) =>
                                setCEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                              }
                              placeholder="PIN (미설정이면 비워두세요)"
                              className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent transition-colors text-sm"
                            />
                            <button
                              onClick={() => handleSaveComment(c.id)}
                              disabled={cEditSaving}
                              className="shrink-0 px-5 py-2.5 rounded-full bg-brand hover:bg-accent-hover font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {cEditSaving ? '저장 중' : '저장'}
                            </button>
                            <button
                              onClick={cancelEditComment}
                              disabled={cEditSaving}
                              className="shrink-0 px-4 py-2.5 rounded-full bg-surface border border-line text-text-secondary hover:bg-surface-strong text-sm transition-colors disabled:opacity-40"
                            >
                              취소
                            </button>
                          </div>
                          {cEditError && (
                            <p className="text-sm text-error bg-error/10 border border-error/20 rounded-lg px-4 py-3">
                              {cEditError}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-text-secondary text-sm leading-relaxed">
                          <LinkifiedText text={c.content} />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {actionMsg && (
                <p className="text-sm text-error bg-error/10 border border-error/20 rounded-lg px-4 py-3 mb-4">
                  {actionMsg}
                </p>
              )}

              {/* 댓글 작성 */}
              <div className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-5 space-y-3">
                <input
                  type="text"
                  value={cNickname}
                  onChange={(e) => setCNickname(e.target.value)}
                  placeholder="닉네임"
                  maxLength={20}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent transition-colors text-sm"
                />
                <textarea
                  value={cContent}
                  onChange={(e) => setCContent(e.target.value)}
                  placeholder="댓글을 입력하세요. (링크를 붙여넣으면 자동으로 클릭 가능해져요)"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent transition-colors resize-none text-sm"
                />
                <div className="flex gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cPin}
                    onChange={(e) => setCPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="수정·삭제용 PIN (필수 · 4자리)"
                    className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent transition-colors text-sm"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={cSubmitting}
                    className="shrink-0 px-6 py-2.5 rounded-full bg-brand hover:bg-accent-hover font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {cSubmitting ? '등록 중...' : '댓글'}
                  </button>
                </div>
                <p className="text-xs text-muted-2 leading-relaxed">
                  🔑 PIN은 나중에 댓글을 수정하거나 지울 때 필요해요. 잊으면 되돌릴 수 없으니
                  기억해두세요.
                </p>
                {cError && (
                  <p className="text-sm text-error bg-error/10 border border-error/20 rounded-lg px-4 py-3">
                    {cError}
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
