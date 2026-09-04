// 홈 = 강사 프로필.
//
// 원래 이 자리에는 지피터스 스터디 랜딩이 있었고, 지금은 app/courses/gpters 로 옮겼다.
// 프로필 본문(역할·이력·최근 프로젝트)의 출처는 아임인부산 OT 발표자료 2번 슬라이드다:
//   _산출물-pptx/2026아임인부산_OT_스페셜강의_송주환_260812_v9.pptx
// 확인되지 않은 경력·수치는 넣지 않는다.

import Link from 'next/link'
import Image from 'next/image'
import { COURSES } from '@/lib/courses'

/**
 * 경력 — pptx 2번 슬라이드 "이력" 그대로.
 * 화면에는 현재 직함이 맨 위에 오도록 최신 → 과거 순으로 적는다.
 */
const CAREER: { tenure: '現' | '前'; role: string }[] = [
  { tenure: '現', role: 'AX / DX 컨설턴트, 중등 과학 강사' },
  { tenure: '前', role: 'IT 컨설턴트' },
  { tenure: '前', role: '물류 스타트업 풀스택 개발자' },
  { tenure: '前', role: '2차전지 시험원' },
]

/**
 * 최근 프로젝트 — pptx 2번 슬라이드 "최근 프로젝트" + 국가기관 LMS 건 추가.
 * "기타 … 다수 진행"은 목록을 닫는 문장이라 항상 마지막에 둔다.
 */
const RECENT_WORK = [
  '지피터스 「Claude Code로 내 업무 자동화」 강사',
  '국가기관 LMS 프로젝트',
  '동물 영양제 회사 CS 챗봇',
  '의류 회사 물류 시스템 자동화',
  '기타 AX 프로젝트 다수 진행',
]

/**
 * 일을 시작할 때 매번 보는 세 가지 — pptx 3번 슬라이드 "3 Check point".
 * 강의에서 반복해 쓰는 관점이라 프로필에도 그대로 둔다.
 */
const CHECKPOINTS = [
  { n: '01', title: '문제 파악', body: '기업이 하는 말은 증상일 때가 많다' },
  { n: '02', title: '데이터 흐름', body: '흐름을 그리면 만들 것이 정해진다' },
  { n: '03', title: '사람이 들어갈 자리', body: '되돌릴 수 없는 동작 앞엔 사람을 둔다' },
]

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-canvas text-fg">
      {/* Hero — 이름과 역할만. 담백하게 */}
      <section className="px-6 pt-24 pb-20 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center gap-8">
          {/*
            프로필 사진. 원본은 아임인부산 OT pptx 2번 슬라이드에 박혀 있던 것을
            얼굴 중심 정사각으로 잘라 640px/24KB 로 줄인 것이다.
            원본 배경이 밝은 회색이라 원형으로 잘라야 어두운 캔버스에서 뜨지 않는다.
          */}
          <Image
            src="/profile/joohwan.jpg"
            alt="송주환"
            width={160}
            height={160}
            priority
            className="w-32 h-32 md:w-40 md:h-40 shrink-0 rounded-full object-cover border border-line"
          />
          <div className="min-w-0">
            <span className="inline-block px-3 py-1 mb-5 text-sm font-medium rounded-full bg-surface border border-line text-accent">
              UD IMPACT · AX / DX 컨설턴트
            </span>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight mb-5">
              송주환
            </h1>
            <p className="text-lg text-text-secondary leading-relaxed">
              업무를 자동화하는 일을 합니다. 그리고 그 방법을 가르칩니다.
              <br className="hidden md:block" />
              <span className="text-muted">도구를 고르는 건 맨 마지막 일입니다.</span>
            </p>
          </div>
        </div>
      </section>

      {/* 일하는 방식 — 카드 3장이 한 줄에 들어가야 해서 이 섹션만 폭을 넓게 쓴다 */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold tracking-tight mb-3 text-fg">만들기 전에 보는 것</h2>
        <p className="text-sm text-muted mb-8">세 가지가 정해지면 방향이 명확해집니다.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {CHECKPOINTS.map((c) => (
            <div
              key={c.n}
              className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-6"
            >
              <p className="text-xs text-accent font-medium mb-3">{c.n}</p>
              <p className="text-fg font-medium mb-2">{c.title}</p>
              <p className="text-sm text-text-secondary leading-relaxed md:whitespace-nowrap">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 이력 · 최근 프로젝트 */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        {/*
          두 카드 높이를 맞춘다: grid 아이템(래퍼 div)은 기본으로 늘어나므로
          래퍼를 flex-col 로 두고 ul 에 flex-1 을 주면 짧은 쪽 카드가 긴 쪽까지 채운다.
          섹션 폭이 5xl 로 넓어지면서 반반으로 나눠도 양쪽 다 한 줄에 떨어진다
          (좁을 때 쓰던 1:1.35 기울임은 더 이상 필요 없어 걷어냈다).
        */}
        <div className="grid gap-6 md:grid-cols-2 items-stretch">
          <div className="flex flex-col">
            <h2 className="text-2xl font-semibold tracking-tight mb-6 text-fg">이력</h2>
            <ul className="flex-1 backdrop-blur-sm bg-surface border border-line rounded-2xl p-6 divide-y divide-line-subtle">
              {CAREER.map((item) => (
                <li
                  key={item.role}
                  className="flex items-baseline gap-2.5 py-3 first:pt-0 last:pb-0"
                >
                  <span
                    className={`shrink-0 text-xs font-medium ${
                      item.tenure === '現' ? 'text-accent' : 'text-muted-2'
                    }`}
                  >
                    {item.tenure}
                  </span>
                  <span className="text-sm text-text-secondary md:whitespace-nowrap">
                    {item.role}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col">
            <h2 className="text-2xl font-semibold tracking-tight mb-6 text-fg">최근 프로젝트</h2>
            <ul className="flex-1 backdrop-blur-sm bg-surface border border-line rounded-2xl p-6 divide-y divide-line-subtle">
              {RECENT_WORK.map((item) => (
                <li
                  key={item}
                  className="text-sm text-text-secondary py-3 first:pt-0 last:pb-0 md:whitespace-nowrap"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 강의 과정 — lib/courses.ts 의 COURSES 를 그대로 따라간다 */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold tracking-tight mb-3 text-fg">온라인 강의실</h2>
        <p className="text-sm text-muted mb-8">진행한 과정과 자료입니다.</p>
        <div className="space-y-4">
          {COURSES.map((course) => (
            <Link
              key={course.slug}
              href={`/courses/${course.slug}`}
              className="block backdrop-blur-sm bg-surface border border-line rounded-2xl p-6 hover:bg-surface-strong transition-colors"
            >
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="flex items-center gap-2">
                  {course.logo ? (
                    <Image
                      src={course.logo.src}
                      alt=""
                      width={course.logo.width}
                      height={course.logo.height}
                      className="h-5 w-auto max-w-24 object-contain"
                    />
                  ) : (
                    // 로고 파일이 아직 없는 과정 — 첫 글자 모노그램으로 자리를 지킨다
                    <span
                      aria-hidden
                      className="flex items-center justify-center w-5 h-5 rounded bg-surface-strong border border-line text-[10px] font-semibold text-muted"
                    >
                      {course.org.slice(0, 1)}
                    </span>
                  )}
                  <span className="text-xs text-muted">{course.org}</span>
                </span>
                {course.badge && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand/20 border border-accent/40 text-accent">
                    {course.badge}
                  </span>
                )}
                {course.period && (
                  <span className="text-xs text-muted-2">{course.period}</span>
                )}
              </div>
              <p className="text-fg font-medium mb-2">{course.title}</p>
              {course.description && (
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  {course.description}
                </p>
              )}
              <span className="text-sm text-accent">과정 보기 →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line px-6 py-8 text-center text-muted-2 text-sm">
        <p>송주환 · UD IMPACT</p>
        <p className="mt-3 text-[11px] text-muted-2">최종 업데이트: 2026-09-04</p>
      </footer>
    </main>
  )
}
