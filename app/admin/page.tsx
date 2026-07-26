'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import type { SurveyResponse, DashboardConfig } from '@/lib/types'

// Real Supabase Auth now (replaces the old NEXT_PUBLIC_ADMIN_PASSWORD
// client-side password compare). The browser client stores the session in
// cookies (@supabase/ssr), so plain same-origin fetch() to /api/admin/*
// automatically carries the session — no manual header needed anymore.
// Public sign-up is disabled on the Supabase project; the only account is
// the one admin created via the Auth Admin API.

const CONFIG_FIELDS: { key: string; label: string }[] = [
  { key: 'claude_code_experience', label: 'Claude Code 경험' },
  { key: 'coding_experience', label: '코딩 경험' },
  { key: 'ai_tools', label: '사용 AI 도구' },
  { key: 'age_range', label: '나이대' },
  { key: 'study_goal', label: '스터디 목표' },
  { key: 'automation_wish', label: '자동화 희망 업무' },
  { key: 'desired_outcome', label: '원하는 결과물' },
]

export default function AdminPage() {
  const [supabase] = useState(() => createBrowserSupabaseClient())
  const [user, setUser] = useState<User | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  const [email, setEmail] = useState('')
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [configs, setConfigs] = useState<DashboardConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  // Check for an existing session on mount, and keep in sync with
  // sign-in/sign-out events (e.g. session expiry).
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setCheckingSession(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const res = await fetch('/api/admin/data')
      if (!res.ok) {
        console.error('[Admin] data load error:', res.status, await res.text())
        setLoadError(true)
      } else {
        const json = await res.json()
        setResponses((json.responses ?? []) as SurveyResponse[])
        setConfigs((json.configs ?? []) as DashboardConfig[])
      }
    } catch (err) {
      console.error('[Admin] Unexpected load error:', err)
      setLoadError(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user) loadData()
  }, [user, loadData])

  const handleLogin = async () => {
    setPwError('')
    setSigningIn(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pwInput,
    })
    setSigningIn(false)
    if (error || !data.user) {
      setPwError('이메일 또는 비밀번호가 올바르지 않습니다.')
      return
    }
    setUser(data.user)
    setPwInput('')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setResponses([])
    setConfigs([])
  }

  const toggleVisibility = async (fieldKey: string, currentValue: boolean) => {
    const res = await fetch('/api/admin/dashboard-config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_key: fieldKey, is_visible: !currentValue }),
    })
    if (res.ok) {
      setConfigs((prev) =>
        prev.map((c) => (c.field_key === fieldKey ? { ...c, is_visible: !currentValue } : c))
      )
    } else {
      console.error('[Admin] toggle error:', res.status, await res.text())
    }
  }

  // Row-level (참여자 단위) 포함 여부 — dashboard_config.is_visible(필드 단위)와
  // 별개. 끄면 /api/dashboard-summary 집계에서만 빠지고, 이 관리자 화면·row
  // 자체는 그대로 남는다(삭제 아님).
  const toggleIncludeInDashboard = async (responseId: string | undefined, currentValue: boolean) => {
    if (!responseId) return
    const res = await fetch(`/api/admin/responses/${responseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ include_in_dashboard: !currentValue }),
    })
    if (res.ok) {
      setResponses((prev) =>
        prev.map((r) => (r.id === responseId ? { ...r, include_in_dashboard: !currentValue } : r))
      )
    } else {
      console.error('[Admin] include_in_dashboard toggle error:', res.status, await res.text())
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-canvas text-fg flex items-center justify-center">
        <p className="text-muted">세션 확인 중...</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-canvas text-fg flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-8">
            <h1 className="text-xl font-semibold tracking-tight mb-6 text-center">관리자 로그인</h1>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              autoComplete="username"
              className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent mb-3"
            />
            <input
              type="password"
              value={pwInput}
              onChange={(e) => setPwInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="비밀번호"
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent mb-3"
            />
            {pwError && <p className="text-sm text-error mb-3">{pwError}</p>}
            <button
              onClick={handleLogin}
              disabled={signingIn || !email || !pwInput}
              className="w-full py-3 rounded-full bg-brand hover:bg-accent-hover font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {signingIn ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-canvas text-fg px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-2xl font-semibold tracking-tight">어드민 대시보드</h1>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-2">{user.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-muted hover:text-fg transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted">데이터 로딩 중...</p>
        ) : loadError ? (
          <div className="backdrop-blur-sm bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-8 text-center">
            <p className="text-yellow-400 font-semibold text-lg mb-2">데이터를 불러오지 못했습니다</p>
            <p className="text-muted text-sm">
              <code className="text-yellow-300">/api/admin/data</code> 호출이 실패했어요. 서버의{' '}
              <code className="text-yellow-300">.env.local</code>에 Supabase URL/service role 키가 설정돼 있는지,
              또는 로그인 세션이 만료되지 않았는지 확인해 주세요.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* 대시보드 공개 설정 */}
            <section>
              <h2 className="text-lg font-semibold mb-4">대시보드 공개 설정</h2>
              <div className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {CONFIG_FIELDS.map((field) => {
                    const config = configs.find((c) => c.field_key === field.key)
                    const isVisible = config?.is_visible ?? false
                    return (
                      <div
                        key={field.key}
                        className="flex items-center justify-between p-3 rounded-xl bg-surface border border-line"
                      >
                        <span className="text-sm text-text-secondary">{field.label}</span>
                        <button
                          onClick={() => toggleVisibility(field.key, isVisible)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            isVisible ? 'bg-brand' : 'bg-surface-strong'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              isVisible ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>

            {/* 응답 목록 */}
            <section>
              <h2 className="text-lg font-semibold mb-4">
                전체 응답 ({responses.length}건)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted border-b border-line">
                      <th className="pb-3 pr-4">이름</th>
                      <th className="pb-3 pr-4">역할</th>
                      <th className="pb-3 pr-4">나이대</th>
                      <th className="pb-3 pr-4">지역</th>
                      <th className="pb-3 pr-4">Claude Code</th>
                      <th className="pb-3 pr-4">코딩</th>
                      <th className="pb-3 pr-4">AI 도구</th>
                      <th className="pb-3 pr-4">스터디 목표</th>
                      <th className="pb-3 pr-4">자동화 희망 업무</th>
                      <th className="pb-3 pr-4">원하는 결과물</th>
                      <th className="pb-3 pr-4">제출일</th>
                      <th className="pb-3">대시보드 포함</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-subtle">
                    {responses.map((r) => {
                      const included = r.include_in_dashboard ?? true
                      return (
                        <tr key={r.id} className="text-text-secondary hover:bg-surface transition-colors">
                          <td className="py-3 pr-4 font-medium text-fg">{r.name}</td>
                          <td className="py-3 pr-4">{r.job_role}</td>
                          <td className="py-3 pr-4">{r.age_range || '-'}</td>
                          <td className="py-3 pr-4">{r.location || '-'}</td>
                          <td className="py-3 pr-4">{r.claude_code_experience}</td>
                          <td className="py-3 pr-4">{r.coding_experience}</td>
                          <td className="py-3 pr-4">{r.ai_tools?.join(', ')}</td>
                          <td className="py-3 pr-4 max-w-[200px] truncate" title={r.study_goal}>
                            {r.study_goal}
                          </td>
                          <td className="py-3 pr-4 max-w-[200px] truncate" title={r.automation_wish}>
                            {r.automation_wish}
                          </td>
                          <td className="py-3 pr-4 max-w-[200px] truncate" title={r.desired_outcome}>
                            {r.desired_outcome}
                          </td>
                          <td className="py-3 pr-4 text-muted-2 whitespace-nowrap">
                            {r.created_at ? new Date(r.created_at).toLocaleDateString('ko-KR') : '-'}
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => toggleIncludeInDashboard(r.id, included)}
                              title={included ? '대시보드 집계에 포함됨 — 클릭하면 제외' : '대시보드 집계에서 제외됨 — 클릭하면 포함'}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                                included ? 'bg-brand' : 'bg-surface-strong'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  included ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {responses.length === 0 && (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-muted-2">
                          아직 응답이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
