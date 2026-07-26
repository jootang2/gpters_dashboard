// 강의자료(/resources) 메타데이터 레지스트리.
//
// 새 자료를 추가하는 방법 (2단계면 끝):
//   1. public/materials/ 에 .md 파일을 넣는다.
//   2. 아래 MATERIALS 배열에 항목 하나를 추가한다.
// 목록 페이지·상세 페이지·다운로드 버튼·정적 생성 경로가 전부 이 배열을 따라간다.
//
// slug 는 URL(/resources/[slug])이 되고, file 은 public/materials/ 아래 파일명이다.
// 둘을 굳이 분리해 둔 이유: 나중에 파일명을 바꿔도 이미 공유된 URL 이 깨지지 않게.

export type Material = {
  /** URL 세그먼트. /resources/[slug] */
  slug: string
  /** public/materials/ 아래 실제 파일명 (.md 포함) */
  file: string
  /** 목록·상세 상단에 보이는 제목 */
  title: string
  /** 목록 카드에 보이는 한 줄 설명 */
  description: string
  /** 몇 주차 자료인지 (목록 그룹 표시용) */
  session: number
  /** 목록 카드 뱃지 문구 */
  badge?: string
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

/** 브라우저에서 원본 .md 를 받을 수 있는 공개 경로 */
export function materialPublicPath(material: Material): string {
  return `/materials/${material.file}`
}
