// 강의자료(/resources) 메타데이터 레지스트리.
//
// 새 자료를 추가하는 방법 (2단계면 끝):
//   1. public/materials/ 에 .md 파일을 넣는다.
//   2. 아래 MATERIALS 배열에 항목 하나를 추가한다.
// 목록 페이지·상세 페이지·다운로드 버튼·정적 생성 경로가 전부 이 배열을 따라간다.
//
// slug 는 URL(/resources/[slug])이 되고, file 은 public/materials/ 아래 파일명이다.
// 둘을 굳이 분리해 둔 이유: 나중에 파일명을 바꿔도 이미 공유된 URL 이 깨지지 않게.
//
// externalPath 를 쓰는 항목 (md 문서가 아니라 외부/정적 페이지로 바로 보내는 카드):
//   - file 을 비워둔다 (존재하지 않는 .md 파일명을 지어내지 않는다 — 다운로드 링크 404 방지).
//   - /resources/[slug] 상세 페이지를 만들지 않는다. 카드 클릭 시 externalPath 로 바로 이동(새 탭).
//   - generateStaticParams 에서 이 항목은 제외된다 (읽을 md 파일이 없으므로).

export type Material = {
  /** URL 세그먼트. /resources/[slug] (externalPath 항목은 이 경로에 실제 페이지가 생성되지 않는다) */
  slug: string
  /** public/materials/ 아래 실제 파일명 (.md 포함). externalPath 항목은 생략한다 */
  file?: string
  /** 목록·상세 상단에 보이는 제목 */
  title: string
  /** 목록 카드에 보이는 한 줄 설명 */
  description: string
  /** 몇 주차 자료인지 (목록 그룹 표시용) */
  session: number
  /** 목록 카드 뱃지 문구 */
  badge?: string
  /**
   * md 상세 렌더 대신 이 경로로 바로 이동시키고 싶을 때 (예: /viz/agent-structure.html).
   * 있으면: 카드가 새 탭으로 이 경로를 열고, /resources/[slug] 정적 페이지·다운로드 버튼은 생성되지 않는다.
   */
  externalPath?: string
}

export const MATERIALS: Material[] = [
  {
    slug: 's1-extra-github-vercel-deploy-mission',
    file: 's1-extra-github-vercel-deploy-mission.md',
    title: '1주차 추가자료 · GitHub + Vercel 배포 미션',
    description:
      '내가 만든 결과물을 인터넷에 올려서 다른 사람이 볼 수 있는 주소로 만드는 실습 가이드.',
    session: 1,
    badge: '추가자료',
  },
  {
    slug: 's2-extra-supabase-dynamic-site',
    file: 's2-extra-supabase-dynamic-site.md',
    title: '2주차 추가자료 · Supabase 연동으로 동적 사이트 준비하기',
    description:
      '1주차에서 만든 사이트에 데이터베이스(Supabase)를 붙여, 방문자가 글을 쓰면 저장되는 진짜 동적 사이트로 바꾸는 실습 가이드.',
    session: 2,
    badge: '추가자료',
  },
  {
    slug: 's2-extra-llm-wiki-setup',
    file: 's2-extra-llm-wiki-setup.md',
    title: '2주차 추가자료 · 내 LLM 위키 만들기',
    description:
      '원문 하나를 붙여넣으면 Claude가 "지식이 복리로 쌓이는 나만의 위키" 뼈대를 만들어 줍니다. 카파시 패턴을 비개발자용으로 옮긴 자료.',
    session: 2,
    badge: '추가자료',
  },
  {
    slug: 's3-extra-agent-teams',
    file: 's3-extra-agent-teams.md',
    title: '3주차 추가자료 · 혼자 일하던 Claude에게 팀을 붙이기',
    description:
      '서브에이전트로 일을 나누고, 에이전트 팀으로 서로 토론시키기. 코드 없이 빈 폴더 하나로 실습',
    session: 3,
    badge: '추가자료',
  },
  {
    slug: 's3-extra-agent-structure-viz',
    externalPath: '/viz/agent-structure.html',
    title: '3주차 추가자료 · 에이전트 구조 시각화',
    description:
      '서브에이전트와 에이전트 팀이 같은 일을 어떻게 다르게 처리하는지 눈으로 비교해 보는 인터랙티브 시각화. 탭 3개 — 서브에이전트 / 에이전트 팀 / 내 설정으로 돌려보기.',
    session: 3,
    badge: '추가자료',
  },
]

/** slug 로 자료 하나 찾기. 없으면 undefined. */
export function getMaterial(slug: string): Material | undefined {
  return MATERIALS.find((m) => m.slug === slug)
}

/** 세션 번호 → 해당 세션 자료 목록 (목록 페이지에서 주차별로 묶어 보여줄 때 사용) */
export function getMaterialsBySession(): { session: number; items: Material[] }[] {
  const sessions = Array.from(new Set(MATERIALS.map((m) => m.session))).sort((a, b) => a - b)
  return sessions.map((session) => ({
    session,
    items: MATERIALS.filter((m) => m.session === session),
  }))
}

/**
 * 브라우저에서 원본 .md 를 받을 수 있는 공개 경로.
 * externalPath 항목(=file 없음)에는 호출하지 않는다 — 호출부에서 material.file 존재를 먼저 확인할 것.
 */
export function materialPublicPath(material: Material): string {
  if (!material.file) {
    throw new Error(`materialPublicPath: '${material.slug}' 항목에 file 이 없습니다 (externalPath 전용 항목).`)
  }
  return `/materials/${material.file}`
}
