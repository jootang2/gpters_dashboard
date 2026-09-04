// 강의 과정(/courses/[slug]) 레지스트리.
//
// 이 사이트는 원래 지피터스 스터디 한 개짜리 페이지였다가, 강사 활동 전체를 담는
// 프로필 사이트로 바뀌었다. 홈(/)은 프로필이고, 각 과정은 이 배열을 따라간다.
//
// 새 과정을 추가하는 방법:
//   1. 아래 COURSES 배열에 항목 하나를 추가한다.
//   2. app/courses/<slug>/page.tsx 를 만든다.
// 홈 하단의 과정 카드 목록은 이 배열만 보고 그려진다.
//
// materialSlugs 는 lib/materials.ts 의 MATERIALS 에 있는 slug 를 가리킨다.
// 한 자료를 여러 과정이 같이 쓸 수 있다 — 실제로 1주차 배포 미션 자료는
// 지피터스와 코스트코 과정이 공유한다. 그래서 자료를 과정 쪽에서 참조만 하고,
// materials.ts 는 과정을 모르게 그대로 뒀다(자료 = 단일 원본, 과정 = 묶음).

export type Course = {
  /** URL 세그먼트. /courses/[slug] */
  slug: string
  /** 카드·상세 상단에 보이는 과정명 */
  title: string
  /** 주최/발주처 (카드 상단 라벨) */
  org: string
  /**
   * org 앞에 붙는 로고. 화면에서는 높이만 고정(h-5)하고 폭은 비율대로 늘어난다 —
   * 정사각 심볼(지피터스)과 가로형 워드마크(코스트코)가 섞여 있기 때문.
   * width/height 는 next/image 가 레이아웃 시프트를 막는 데 쓰는 원본 비율이라
   * 실제 파일 크기를 그대로 적는다.
   * 없으면 카드가 org 첫 글자를 딴 모노그램 타일을 대신 그린다.
   */
  logo?: { src: string; width: number; height: number }
  /** 카드에 보이는 한 줄 설명. 없으면 카드/히어로에서 그 줄이 통째로 빠진다 */
  description?: string
  /**
   * 카드 우측에 보이는 기간 표기. 확정된 일정이 없으면 생략한다
   * (없는 날짜를 지어내지 않는다 — 카드에서 해당 줄이 통째로 빠진다).
   */
  period?: string
  /** 카드 뱃지 문구 (예: '진행 완료', '진행 중') */
  badge?: string
  /** 이 과정에서 제공하는 자료들의 slug (lib/materials.ts 의 MATERIALS 참조) */
  materialSlugs: string[]
}

export const COURSES: Course[] = [
  {
    slug: 'gpters',
    title: 'Claude Code로 내 업무 자동화 AI팀 만들기',
    org: '지피터스(GPTers) AI 스터디',
    logo: { src: '/courses/gpters.png', width: 128, height: 128 },
    description:
      '비개발자도 4주면 충분합니다. 반복 업무를 Claude Code에 넘기고, 에이전트를 여러 개 붙여 내 AI팀을 만드는 4주 과정.',
    period: '2026.7.21 – 8.11',
    badge: '4주 과정',
    materialSlugs: [
      's1-extra-github-vercel-deploy-mission',
      's2-extra-supabase-dynamic-site',
      's2-extra-llm-wiki-setup',
      's3-extra-agent-teams',
      's3-extra-agent-structure-viz',
    ],
  },
  {
    slug: 'costco',
    title: '코스트코 내부 강의',
    org: '코스트코',
    // 출처: Wikimedia Commons 의 공식 워드마크 SVG(단순 도형·문자라 저작권 임계 미달 =
    // 퍼블릭 도메인). next/image 는 SVG 를 기본 차단하므로 PNG 로 변환해 넣었다.
    logo: { src: '/courses/costco.png', width: 223, height: 80 },
    badge: '3시간 · 길잡이 과정',
    // 아직 공개할 자료가 없다. 비어 있으면 과정 페이지가 '준비중'만 띄운다.
    // 자료가 생기면 MATERIALS 에 등록하고 여기에 slug 를 넣으면 된다.
    materialSlugs: [],
  },
]

/** slug 로 과정 하나 찾기. 없으면 undefined. */
export function getCourse(slug: string): Course | undefined {
  return COURSES.find((c) => c.slug === slug)
}
