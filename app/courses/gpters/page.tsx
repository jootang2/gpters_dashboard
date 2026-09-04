'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { MATERIALS } from '@/lib/materials'

type Material = {
  name: string
  notionUrl: string
}

type Session = {
  number: number
  date: string
  title: string
  materials: Material[]
}

const SESSIONS: Session[] = [
  {
    number: 1,
    date: '7/21',
    title: 'Claude Code 첫인상 & 내 업무 지도 그리기',
    materials: [
      { name: '반복 업무 발굴 워크시트', notionUrl: '#' },
      { name: '첫 대화 예시 모음', notionUrl: '#' },
    ],
  },
  {
    number: 2,
    date: '7/28',
    title: '첫 자동화 직접 만들기',
    materials: [
      { name: 'CLAUDE.md 템플릿', notionUrl: '#' },
      { name: '프롬프트 설계 원칙', notionUrl: '#' },
      { name: '실습 예제 3개', notionUrl: '#' },
    ],
  },
  {
    number: 3,
    date: '8/4',
    title: '에이전트 여러 개 = 내 AI팀 만들기',
    materials: [
      { name: 'Fivemonkeys 케이스 스터디', notionUrl: '#' },
      { name: '에이전트 구조도 템플릿', notionUrl: '#' },
      { name: 'CLAUDE.md 분리 예시', notionUrl: '#' },
    ],
  },
  {
    number: 4,
    date: '8/11',
    title: '내 AI팀 발표 & 지속 운영 전략',
    materials: [
      { name: '발표 템플릿', notionUrl: '#' },
      { name: '지속 운영 체크리스트', notionUrl: '#' },
      { name: '트러블슈팅 가이드', notionUrl: '#' },
    ],
  },
]

function MaterialModal({
  material,
  onClose,
}: {
  material: Material
  onClose: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const isPending = material.notionUrl === '#'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-surface backdrop-blur border border-line rounded-2xl p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-fg transition-colors text-lg leading-none"
          aria-label="닫기"
        >
          ✕
        </button>

        {/* 아이콘 + 제목 */}
        <div className="mb-6">
          <p className="text-2xl mb-3">📄</p>
          <h3 className="text-lg font-semibold text-fg">{material.name}</h3>
        </div>

        <p className="text-text-secondary text-sm mb-4 leading-relaxed">
          Notion 페이지에서 자료를 확인할 수 있습니다.
        </p>

        {isPending && (
          <p className="text-yellow-400 text-sm mb-6">⚠️ 현재 준비 중입니다.</p>
        )}

        {/* 버튼 영역 */}
        <div className="flex gap-3">
          <a
            href={material.notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 text-center px-4 py-2.5 rounded-full text-sm font-medium bg-brand text-white transition-colors ${
              isPending
                ? 'opacity-50 pointer-events-none'
                : 'hover:bg-accent-hover'
            }`}
          >
            Notion에서 보기 →
          </a>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-full text-sm font-medium bg-surface border border-line text-text-secondary hover:bg-surface-strong transition-colors"
          >
            닫기
          </button>
        </div>

        {/* 공개된 강의자료로 가는 통로 — 준비 중인 자료여도 여기서 확인 가능 */}
        <div className="mt-5 pt-4 border-t border-line text-center">
          <Link
            href="/resources"
            onClick={onClose}
            className="text-xs text-muted hover:text-text-secondary transition-colors"
          >
            📚 공개된 강의자료 전체 보기 →
          </Link>
        </div>
      </div>
    </div>
  )
}

// 세션별 "추가 자료" 버튼.
// lib/materials.ts 에 해당 주차 자료가 등록돼 있으면 /resources 로 보내고,
// 아직 없으면 기존 "준비 중" 모달을 띄운다. 자료가 추가되면 배열만 늘리면
// 이 버튼이 자동으로 링크로 바뀐다.
function SessionMaterialsButton({
  session,
  onPending,
}: {
  session: number
  onPending: () => void
}) {
  const items = MATERIALS.filter((m) => m.session === session)
  const className =
    'inline-block text-xs px-3 py-1.5 rounded-full bg-surface border border-line text-muted hover:bg-surface-strong transition-colors cursor-pointer'

  if (items.length === 0) {
    return (
      <button onClick={onPending} className={className}>
        📎 추가 자료
      </button>
    )
  }

  // 자료가 하나면 바로 그 자료로, 여러 개면 목록으로.
  // 단, 그 하나가 externalPath 항목(md 상세 페이지가 없음)이면 /resources/[slug] 대신
  // externalPath 를 새 탭으로 바로 연다 — 그렇지 않으면 존재하지 않는 상세 페이지로 보내 404가 난다.
  if (items.length === 1 && items[0].externalPath) {
    return (
      <a
        href={items[0].externalPath}
        target="_blank"
        rel="noopener noreferrer"
        className={`${className} text-accent border-accent/40`}
      >
        📎 추가 자료 →
      </a>
    )
  }

  const href = items.length === 1 ? `/resources/${items[0].slug}` : '/resources'

  return (
    <Link href={href} className={`${className} text-accent border-accent/40`}>
      📎 추가 자료 {items.length > 1 ? `${items.length}개` : ''}→
    </Link>
  )
}

export default function HomePage() {
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)

  return (
    <main className="min-h-screen bg-canvas text-fg">
      {/* 프로필(홈)으로 돌아가는 통로 — 이 페이지는 여러 과정 중 하나다 */}
      <div className="px-6 pt-8 max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-2 hover:text-text-secondary transition-colors"
        >
          ← 송주환 프로필
        </Link>
      </div>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-16 pb-16 text-center">
        <div className="max-w-3xl mx-auto">
          {/* GPTers 브랜딩 */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <img
              src="https://tribe-s3-production.imgix.net/MXEGOlfepv60LLgDIqKDr"
              alt="GPTers"
              className="h-7 w-auto object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <span className="text-sm font-semibold text-text-secondary tracking-wide">GPTers</span>
            <span className="text-muted-2">×</span>
            <span className="text-sm font-semibold text-accent tracking-wide">Claude Code</span>
          </div>
          <span className="inline-block px-3 py-1 mb-6 text-sm font-medium rounded-full bg-surface border border-line text-accent">
            지피터스 AI 스터디 · 2026
          </span>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight mb-6">
            반복 업무는 그만,{' '}
            <span className="text-accent">Claude Code</span>로{' '}
            <br className="hidden md:block" />
            내 업무 자동화 AI팀 만들기
          </h1>
          <p className="text-lg md:text-xl text-text-secondary mb-10 leading-relaxed">
            비개발자도 4주면 충분합니다.
            <br />
            매주 화요일 밤 9시, 함께 만들어요.
          </p>
          <Link
            href="/survey"
            className="inline-block px-8 py-4 text-lg font-semibold rounded-full bg-brand hover:bg-accent-hover transition-colors duration-200 shadow-lg shadow-brand/25"
          >
            사전 진단하기 →
          </Link>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link
              href="/board"
              className="text-sm text-muted hover:text-text-secondary transition-colors"
            >
              💬 참가자 공유 게시판 바로가기 →
            </Link>
            <span className="text-muted-2 hidden sm:inline">·</span>
            <Link
              href="/resources"
              className="text-sm text-muted hover:text-text-secondary transition-colors"
            >
              📚 강의자료 보기 →
            </Link>
          </div>
        </div>
      </section>

      {/* 스터디 개요 */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold tracking-tight text-center mb-12 text-fg">스터디 개요</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '기간', value: '7.21 – 8.11' },
            { label: '총 횟수', value: '4회' },
            { label: '일정', value: '매주 화요일 밤 9~11시' },
            { label: '난이도', value: '입문 🐥' },
          ].map((item) => (
            <div
              key={item.label}
              className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-6 text-center"
            >
              <p className="text-xs text-muted mb-2 uppercase tracking-widest">{item.label}</p>
              <p className="text-base font-semibold text-fg">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 커리큘럼 */}
      <section className="px-6 py-20 max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold tracking-tight text-center mb-12 text-fg">커리큘럼</h2>
        <div className="space-y-6">
          {SESSIONS.map((s, idx) => (
            <div
              key={idx}
              className="relative flex items-start gap-6 backdrop-blur-sm bg-surface border border-line rounded-2xl p-6"
            >
              {/* 세션 번호 */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand/20 border border-accent/40 shrink-0 text-accent text-xs font-bold">
                {s.number}
              </div>

              {/* 세션 내용 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs text-accent font-medium">Session {s.number}</span>
                  <span className="text-xs text-muted-2">{s.date}</span>
                </div>
                <p className="text-fg font-medium mb-4">{s.title}</p>

                {/* 추가 자료 */}
                <div>
                  <SessionMaterialsButton
                    session={s.number}
                    onPending={() =>
                      setSelectedMaterial({ name: '추가 자료', notionUrl: '#' })
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line px-6 py-8 text-center text-muted-2 text-sm">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span>지피터스(GPTers) AI 스터디</span>
          <span className="text-muted-2">·</span>
          <a href="https://www.gpters.org" target="_blank" rel="noopener noreferrer" className="hover:text-text-secondary transition-colors">
            gpters.org
          </a>
          <span className="text-muted-2">·</span>
          <span>by 송주환</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <Link href="/board" className="text-xs text-muted-2 hover:text-muted transition-colors">
            공유 게시판 →
          </Link>
          <span className="text-muted-2">·</span>
          <Link
            href="/resources"
            className="text-xs text-muted-2 hover:text-muted transition-colors"
          >
            강의자료 →
          </Link>
          <span className="text-muted-2">·</span>
          <Link href="/dashboard" className="text-xs text-muted-2 hover:text-muted transition-colors">
            참여자 현황 →
          </Link>
          <span className="text-muted-2">·</span>
          <Link href="/" className="text-xs text-muted-2 hover:text-muted transition-colors">
            강사 프로필 →
          </Link>
        </div>
      </footer>

      {/* 자료 모달 */}
      {selectedMaterial && (
        <MaterialModal
          material={selectedMaterial}
          onClose={() => setSelectedMaterial(null)}
        />
      )}
    </main>
  )
}
