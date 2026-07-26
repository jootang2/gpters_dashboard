'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts'

// 다크모드(canvas #08090a) 위에서 대비 검증된 고정 순서 팔레트.
// 카테고리(정체성) 인코딩이므로 이 순서를 절대 섞지 않는다 — 값(name) 하나마다
// 아래 CATEGORY_OPTION_ORDER의 고정 인덱스로만 색을 찾는다(count 크기로 정렬된
// data 배열의 위치를 절대 색 인덱스로 쓰지 않음). 그래야 필터로 응답 수/순위가
// 바뀌어도 살아남은 항목의 색이 그대로 유지된다.
const COLORS = [
  '#3987e5', // blue
  '#008300', // green
  '#d55181', // magenta
  '#c98500', // yellow
  '#199e70', // aqua
  '#d95926', // orange
  '#9085e9', // violet
  '#e66767', // red
]

// 실제 설문 선택지 순서(app/survey/page.tsx 기준) — 값의 "정체성"과 팔레트
// 인덱스를 1:1로 고정 매핑하기 위한 기준표. 여기 없는 필드/값은
// colorForValue()의 폴백(이름 기반 결정적 해시)으로만 처리된다.
const CATEGORY_OPTION_ORDER: Record<string, string[]> = {
  claude_code_experience: ['처음 들어봄', '들어봤지만 안 써봄', '써봤음'],
  coding_experience: ['없음', '조금', '있음'],
  age_range: ['10대', '20대', '30대', '40대', '50대 이상'],
}

function colorForValue(field: string, name: string): string {
  const order = CATEGORY_OPTION_ORDER[field]
  const idx = order?.indexOf(name) ?? -1
  if (idx !== -1) return COLORS[idx % COLORS.length]
  // 폴백: 알려지지 않은 값이라도 이름 자체로부터 결정적으로 색을 뽑는다
  // (요청/필터마다 값이 바뀌지 않도록 — Math.random 등 비결정적 방식 금지).
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return COLORS[hash % COLORS.length]
}

// 이 페이지는 더 이상 survey_responses/dashboard_config를 직접 읽지 않는다.
// RLS가 anon key의 두 테이블 SELECT를 막고 있고, 원본 응답은 admin만 봐야
// 하므로 /api/dashboard-summary (service_role, 서버 집계)의 결과만 받는다.
type SummaryField = { field: string; label: string; data: { name: string; value: number }[] }
type SummaryTextField = { field: string; label: string; items: string[] }
type DashboardSummary = {
  totalCount: number
  hasConfig: boolean
  categories: SummaryField[]
  arrays: SummaryField[]
  texts: SummaryTextField[]
}

function TextSlider({ items, label }: { items: string[]; label: string }) {
  const [idx, setIdx] = useState(0)
  if (!items.length) return null
  return (
    <div className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-6">
      <h3 className="text-sm text-muted mb-4">{label}</h3>
      <div className="min-h-[80px] flex items-center">
        <p className="text-fg leading-relaxed">&quot;{items[idx]}&quot;</p>
      </div>
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)}
          className="text-muted hover:text-fg px-3 py-1 rounded-lg hover:bg-surface-strong transition-colors"
        >
          ←
        </button>
        <span className="text-xs text-muted-2">
          {idx + 1} / {items.length}
        </span>
        <button
          onClick={() => setIdx((i) => (i + 1) % items.length)}
          className="text-muted hover:text-fg px-3 py-1 rounded-lg hover:bg-surface-strong transition-colors"
        >
          →
        </button>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard-summary')
        if (!res.ok) {
          console.error('[Dashboard] summary load error:', res.status, await res.text())
          setLoadError(true)
        } else {
          setSummary((await res.json()) as DashboardSummary)
        }
      } catch (err) {
        console.error('[Dashboard] Unexpected load error:', err)
        setLoadError(true)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-canvas text-fg flex items-center justify-center">
        <p className="text-muted">데이터 로딩 중...</p>
      </main>
    )
  }

  if (!loadError && (!summary || summary.totalCount === 0)) {
    return (
      <main className="min-h-screen bg-canvas text-fg flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-12">
            <p className="text-5xl mb-6">📭</p>
            <h2 className="text-xl font-semibold tracking-tight mb-3">아직 데이터가 없습니다</h2>
            <p className="text-muted text-sm mb-8 leading-relaxed">
              설문 응답이 들어오면<br />여기서 분석 결과를 확인할 수 있어요.
            </p>
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors">
              ← 홈으로
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (loadError || !summary) {
    return (
      <main className="min-h-screen bg-canvas text-fg flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-12">
            <p className="text-4xl font-bold text-accent mb-4">0</p>
            <p className="text-muted mb-6">응답 없음</p>
            <p className="text-xs text-muted-2">
              집계 API 연결이 설정되면 실제 데이터가 표시됩니다.
            </p>
          </div>
        </div>
      </main>
    )
  }

  const anyVisible = summary.categories.length > 0 || summary.arrays.length > 0 || summary.texts.length > 0

  return (
    <main className="min-h-screen bg-canvas text-fg px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-2 hover:text-text-secondary transition-colors">
            ← 홈으로
          </Link>
        </div>
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold tracking-tight mb-2">참여자 현황</h1>
          <p className="text-muted">Claude Code 스터디 사전 설문 집계</p>
        </div>

        {/* 전체 응답 수 카드 (항상 표시) */}
        <div className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-8 text-center mb-8">
          <p className="text-sm text-muted mb-2">전체 응답 수</p>
          <p className="text-6xl font-bold text-accent">{summary.totalCount}</p>
          <p className="text-muted mt-2">명이 참여했습니다</p>
        </div>

        {/* 카테고리 차트 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {summary.categories.map(({ field, label, data }) => (
            <div
              key={field}
              className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-6"
            >
              <h3 className="text-sm text-muted mb-4">{label}</h3>
              {/* 선택지가 5개 이상인 필드(예: age_range)는 색만으로 구분을 강요하지
                  않고 조각에 직접 라벨을 붙인다 — 아래에서 유지되는 범례와 함께
                  색맹/저대비 상황에서도 구분 가능하게 함. */}
              <ResponsiveContainer width="100%" height={data.length >= 5 ? 240 : 200}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={data.length >= 5 ? 70 : 80}
                    paddingAngle={3}
                    dataKey="value"
                    label={data.length >= 5 ? ({ name }) => name : undefined}
                    labelLine={data.length >= 5}
                  >
                    {data.map((item) => (
                      <Cell key={item.name} fill={colorForValue(field, item.name)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f1011', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f7f8f8' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* 범례 — 색상 인덱스가 아니라 값(name) 기준으로 색을 조회하므로
                  응답 수/순위가 바뀌어도 항목별 색이 그대로 유지된다. */}
              <div className="flex flex-wrap gap-2 mt-2">
                {data.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: colorForValue(field, item.name) }}
                    />
                    <span className="text-xs text-text-secondary">
                      {item.name} ({item.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 배열형 차트 */}
        {summary.arrays.map(({ field, label, data }) => (
          <div
            key={field}
            className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-6 mb-6"
          >
            <h3 className="text-sm text-muted mb-4">{label}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data} layout="vertical">
                <XAxis type="number" stroke="#62666d" tick={{ fill: '#8a8f98', fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  stroke="#62666d"
                  tick={{ fill: '#8a8f98', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f1011', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f7f8f8' }}
                />
                <Bar dataKey="value" fill="#5e6ad2" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}

        {/* 텍스트 카드 슬라이드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {summary.texts.map(({ field, label, items }) => (
            <TextSlider key={field} items={items} label={label} />
          ))}
        </div>

        {summary.hasConfig && !anyVisible && (
          <div className="text-center text-muted-2 py-16">
            <p>현재 공개된 항목이 없습니다.</p>
          </div>
        )}
      </div>
    </main>
  )
}
