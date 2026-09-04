// 코스트코 내부 강의 과정 페이지.
//
// 과정 메타는 lib/courses.ts 의 COURSES('costco'), 자료는 그 항목의 materialSlugs 가
// lib/materials.ts 의 MATERIALS 를 가리킨다.
//
// 커리큘럼은 지피터스 페이지가 SESSIONS 를 인라인으로 두는 것과 같은 방식으로
// 이 파일 안에 둔다(레지스트리는 과정 카드용 공통 메타만 담는다).
//
// 설계 근거 — 담당자(이다연)와 주고받은 사전 확인 내용:
//   · 참가자 3명, 회사 회의실, 기기는 개인 노트북 하나(자리·기기 전환 없음)
//   · 회사 계정에서 쓸 수 있는 것: Gemini Pro(기업), AppSheet, Apps Script,
//     NotebookLM, Looker Studio. 외부 LLM 은 개인 노트북에서만.
//   · 목표 결과물 형태를 담당자가 캡처로 공유(Looker Studio 안전점검 준수율 대시보드).
//     ⚠ 캡처의 실제 사업장명·수치·문항 문구는 사내 정보라 이 레포(공개)에 옮기지 않는다.
//
// 과정 성격 — "만들어 주는" 강의가 아니라 "방향을 잡아주는" 길잡이(사용자 확정).
// 그래서 커리큘럼의 축을 결과물 3개가 아니라 '도구별 역할 분담'으로 바꿨다.
// AppSheet·Apps Script 만으로 안 되는 일이 분명히 있으므로, 각 도구의 한계를
// 숫자로 먼저 깔고 "이 일은 어느 층에 두어야 하는가"를 판단 기준으로 가르친다.
//
// 확인한 사실(2026-09-04 조사):
//   · Apps Script 쿼터(Workspace): 실행당 6분, 트리거 총 6시간/일,
//     UrlFetch 100,000회/일·응답 50MB/호출, 동시 실행 30/user
//     → 대량 처리는 실시간이 아니라 '스케줄 배치 + 분할 실행'으로 설계해야 한다
//     https://developers.google.com/apps-script/guides/services/quotas
//   · AppSheet Automation 이 Apps Script 함수 호출을 공식 지원(Apps Script Task)
//     https://support.google.com/appsheet/answer/11997142
//   · 국가법령정보 공동활용 OPEN API(법제처) — 목록조회/본문조회, 개발계정 무료
//     https://open.law.go.kr/LSO/openApi/openApiManual.do
//     → 법령 수집을 Apps Script UrlFetchApp 으로 사내 계정 안에서 끝낼 수 있다.
//       Claude Code 는 런타임이 아니라 '그 코드를 짜는 도구' 로 위치를 바꿨다.
//       사내 데이터는 나가지 않고, 코드만 회사 계정으로 들어온다.
//
// ⚠ 가장 중요한 제약(2026-09-04 확인) — "외부 LLM 으로 AppSheet 를 만들 수 없다":
//   · AppSheet API 는 테이블 레코드 CRUD 와 기정의 액션 호출만 제공한다.
//     앱 정의(테이블·뷰·액션 구조)를 만들거나 고치는 API 가 없다.
//     https://support.google.com/appsheet/answer/11628886
//     → Claude 가 AppSheet 앱을 짜서 넣어주는 경로는 존재하지 않는다.
//   · 대신 AppSheet 제품 안에 Gemini 가 들어와 있다(Gemini for App Creation).
//     에디터에서 Create > App > Start with Gemini 로 업무를 자연어로 설명하면
//     테이블·컬럼 스키마와 기본 뷰·액션까지 만들어 준다. AppSheet Core 에 포함.
//     https://support.google.com/appsheet/answer/14699210
//   · Looker Studio 도 0 에서 리포트를 만드는 API 는 없다. Linking API 는
//     '미리 만들어 둔 템플릿 리포트를 URL 파라미터로 복제'하는 용도다.
//     https://developers.google.com/looker-studio/integrate/linking-api
//
// 여기서 이 과정의 핵심 메시지가 나온다 —
//   AI 가 대신 만들어 줄 수 있는 것은 '텍스트(코드)로 표현되는 일'뿐이다.
//   AppSheet·Looker 는 GUI 산출물이라 사람이 만든다(제품 내장 Gemini 의 도움까지가 한계).
//   그러므로 AI 레버리지를 키우고 싶으면 로직을 Apps Script 쪽으로 밀어야 한다.
//   커리큘럼도 이 순서를 따른다: 흐름 파악 → 손으로 만드는 층 → AI 가 쓰는 층.
import Link from 'next/link'
import { getCourse } from '@/lib/courses'
import { getMaterial } from '@/lib/materials'
import { getCurriculum } from '@/lib/curriculum'
import CurriculumSection from './CurriculumSection'

// 커리큘럼을 DB 에서 읽어 화면에서 편집할 수 있게 하면서 이 페이지는 요청마다
// 새로 그려져야 한다(저장 직후 바로 반영되어야 하므로).
export const dynamic = 'force-dynamic'

/** 강의 전에 끝나 있어야 하는 것. 하나라도 비면 3시간 안에 결과물이 안 나온다. */
const PREWORK: { who: string; task: string; why: string }[] = [
  {
    who: '담당자',
    task: '점검 체크리스트 raw data sheet 1개 (문항 목록 + 결과 몇 건. 사업장명·수치는 가짜 값으로)',
    why: '2부부터 끝까지 이 시트 하나 위에서 움직인다. 없으면 실습이 통째로 멈춘다.',
  },
  {
    who: '참가자',
    task: '개인 노트북 브라우저에서 회사 계정으로 AppSheet · Apps Script · Looker Studio 로그인 확인',
    why: '개인 기기에서 사내 계정이 열리는지가 오늘 전체의 전제다. 권한 문제를 현장에서 풀면 30분씩 새어나간다.',
  },
  {
    who: '참가자',
    task: '개인 노트북에 Claude Code 설치 + 로그인까지 확인',
    why: '4부에서 Apps Script 코드를 짜는 도구로 쓴다. 설치를 현장에서 하면 실습 시간이 사라진다.',
  },
  {
    who: '담당자',
    task: '국가법령정보 OPEN API 개발계정 신청 (open.law.go.kr)',
    why: '승인에 시간이 걸릴 수 있다. 강의 당일에 신청하면 5부에서 호출을 못 해본다.',
  },
  {
    who: '담당자',
    task: '기존 Apps Script 대시보드 캡처 공유',
    why: '이미 굴러가는 것 위에 얹을지 새로 만들지를 강의 전에 정해둔다.',
  },
]

export default async function CostcoCoursePage() {
  const course = getCourse('costco')!
  const materials = course.materialSlugs
    .map((slug) => getMaterial(slug))
    .filter((m) => m !== undefined)
  const curriculum = await getCurriculum('costco')

  return (
    <main className="min-h-screen bg-canvas text-fg">
      <div className="px-6 pt-8 max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-2 hover:text-text-secondary transition-colors"
        >
          ← 송주환 프로필
        </Link>
      </div>

      {/* Hero */}
      <section className="px-6 pt-16 pb-16 max-w-3xl mx-auto">
        <span className="inline-block px-3 py-1 mb-6 text-sm font-medium rounded-full bg-surface border border-line text-accent">
          {course.org}
        </span>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight mb-6">
          {course.title}
        </h1>
        <p className="text-lg text-text-secondary leading-relaxed">{course.description}</p>
      </section>

      {/* 개요 */}
      <section className="px-6 pb-20 max-w-3xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '시간', value: '3시간' },
            { label: '인원', value: '3명' },
            { label: '장소', value: '사내 회의실' },
            { label: '기기', value: '개인 노트북' },
          ].map((item) => (
            <div
              key={item.label}
              className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-6 text-center"
            >
              <p className="text-xs text-muted mb-2 uppercase tracking-widest">{item.label}</p>
              <p className="text-sm font-semibold text-fg">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 사전 준비 */}
      <section className="px-6 pb-20 max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold tracking-tight mb-8 text-fg">강의 전 준비</h2>
        <ul className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-6 divide-y divide-line-subtle">
          {PREWORK.map((p) => (
            <li key={p.task} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand/20 border border-accent/40 text-accent">
                  {p.who}
                </span>
                <span className="text-sm text-fg font-medium">{p.task}</span>
              </div>
              <p className="text-sm text-muted leading-relaxed">{p.why}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 커리큘럼 — 표시와 관리자 편집을 클라이언트 컴포넌트가 맡는다 */}
      <CurriculumSection courseSlug="costco" initialBlocks={curriculum} />

      {/* 강의자료 — 아직 올릴 자료가 없으면 '준비중'만 띄운다 */}
      <section className="px-6 pb-24 max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold tracking-tight mb-8 text-fg">강의자료</h2>
        {materials.length === 0 ? (
          <div className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-6">
            <p className="text-sm text-muted">준비중</p>
          </div>
        ) : (
          <div className="space-y-4">
            {materials.map((m) => (
              <Link
                key={m.slug}
                href={`/resources/${m.slug}`}
                className="block backdrop-blur-sm bg-surface border border-line rounded-2xl p-5 hover:bg-surface-strong transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-accent font-medium">{m.session}주차</span>
                  {m.badge && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand/20 border border-accent/40 text-accent">
                      {m.badge}
                    </span>
                  )}
                </div>
                <p className="text-fg font-medium mb-2">{m.title}</p>
                <p className="text-sm text-text-secondary leading-relaxed">{m.description}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
      {/* Footer */}
      <footer className="border-t border-line px-6 py-8 text-center text-muted-2 text-sm">
        <div className="flex items-center justify-center gap-3">
          <span>{course.org}</span>
          <span className="text-muted-2">·</span>
          <span>by 송주환</span>
        </div>
        <div className="mt-3">
          <Link href="/" className="text-xs text-muted-2 hover:text-muted transition-colors">
            강사 프로필 →
          </Link>
        </div>
      </footer>
    </main>
  )
}
