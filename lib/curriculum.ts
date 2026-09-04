// 과정 커리큘럼 — 코드 기본값 + DB 덮어쓰기.
//
// 읽기 규칙(중요):
//   course_curriculum 테이블에 그 과정 행이 있으면 DB 값을 쓰고,
//   한 행도 없으면 아래 DEFAULT_CURRICULUM 을 쓴다.
//   덕분에 마이그레이션 전에도 화면이 그대로 뜨고, 관리자가 처음 저장하는
//   순간부터 DB 가 정본이 된다. 코드 기본값은 '초기 시드 겸 안전망'이다.
//
// 쓰기는 이 파일에서 하지 않는다 — app/api/admin/curriculum (service_role +
// requireAdminUser) 한 곳으로만 들어간다. anon 키에는 쓰기 정책이 없다.

import { createServerSupabaseClient } from './supabase/server'

export type CurriculumBlock = {
  /** 예: '0:00 – 0:20' */
  time: string
  title: string
  /** 그 블록이 다루는 데이터 경계 태그. 비워도 된다. */
  scope?: string
  points: string[]
}

/**
 * 코스트코 내부 강의 기본 커리큘럼.
 *
 * 설계 근거는 app/courses/costco/page.tsx 상단 주석 참고 —
 * 요약하면 "AI 가 대신 만들어 줄 수 있는 것은 텍스트(코드)로 표현되는 일뿐"이라
 * 1부에서 데이터 흐름을 그리고, 2·3부는 사람이 만드는 층(AppSheet·Looker),
 * 4·5부는 AI 가 쓰는 층(Apps Script)으로 순서를 잡았다.
 */
const COSTCO_DEFAULT: CurriculumBlock[] = [
  {
    time: '0:00 – 0:20',
    title: '1부 · 데이터 플로우 파악',
    scope: '구현 전',
    points: [
      '지금 데이터가 어디서 생겨 어디를 거쳐 어디서 보이는지 한 줄로 그려본다',
      '말로 들은 문제 말고 진짜 병목 찾기 — 요청은 대개 증상이다',
      '사람이 손으로 다시 만들고 있는 칸 표시하기. 거기가 오늘 건드릴 자리다',
      '그중 사람이 계속 판단해야 하는 칸 골라내기 — 전부 자동이 답은 아니다',
      '오늘 뚫을 한 줄을 확정하고 구현으로 넘어간다',
    ],
  },
  {
    time: '0:20 – 1:05',
    title: '2부 · 구현 ① 입력 — AppSheet',
    scope: '사람이 만드는 층 · 내장 Gemini',
    points: [
      '먼저 짚을 것 — 외부 AI 로 AppSheet 앱을 만들 수는 없다. API 는 레코드 CRUD 와 액션 호출까지다',
      '대신 제품 안의 Gemini 를 쓴다: Create > App > Start with Gemini 에 업무를 말로 설명',
      'Gemini 가 내놓은 테이블·컬럼 스키마가 1부에서 그린 흐름과 맞는지 따져보고 고치기',
      '손질은 에디터에서 — 부서 고르면 그 부서 문항만, No 일 때만 사유 칸이 열리게',
      '수식이 막히면 Gemini Pro 에 물어가며 — 여기까지가 AI 가 도와줄 수 있는 선',
    ],
  },
  {
    time: '1:05 – 1:15',
    title: '휴식',
    points: [],
  },
  {
    time: '1:15 – 1:55',
    title: '3부 · 구현 ② 표현 — Looker Studio',
    scope: '사람이 만드는 층',
    points: [
      '2부에서 쌓인 그 시트를 그대로 소스로 연결 — 데이터를 두 벌 만들지 않는다',
      '상단 필터 줄, 한눈에 보는 숫자, 표와 막대, 페이지 나누기',
      '여기도 0 에서 만들어 주는 API 는 없다 — 사람이 만든다. 다만 한 번 만들면 템플릿으로 복제는 된다',
      '사내 공유 권한 — 링크 전체공개 대신 도메인 내 공유로 잠그기',
    ],
  },
  {
    time: '1:55 – 2:30',
    title: '4부 · 구현 ③ 처리 — Apps Script',
    scope: 'AI 가 쓰는 층 · 사내 데이터',
    points: [
      '코드는 텍스트라 Claude·Gemini 가 통째로 써 준다 — 오늘 처음으로 AI 가 결과물을 만드는 구간',
      '집계 스크립트 하나 — 원본 시트를 읽어 요약 시트에 써두고, Looker 는 요약본만 본다',
      '시간 트리거로 매일 자동 실행, 6분 제한에 걸리지 않게 나눠 도는 구조',
      'AppSheet 자동화에서 이 함수를 직접 호출(공식 지원되는 Apps Script Task)',
      '판단 연습: 이 로직을 AppSheet 수식에 둘 것인가, Apps Script 로 뺄 것인가 — AI 를 쓰려면 후자다',
    ],
  },
  {
    time: '2:30 – 2:50',
    title: '5부 · 구현 ④ 바깥 데이터 — 법령 재개정',
    scope: '공개 데이터 · 사내 계정에서 실행',
    points: [
      '국가법령정보 공동활용 OPEN API(법제처) — 목록조회로 개정 이력, 본문조회로 조문',
      'Apps Script 의 UrlFetchApp 으로 호출해 시트에 적재 → Looker 로 보기. 회사 계정 안에서 끝난다',
      'Claude Code 의 자리 — 결과를 만드는 곳이 아니라 그 코드를 짜는 도구. 넘어오는 건 코드뿐이다',
    ],
  },
  {
    time: '2:50 – 3:00',
    title: '마무리 · 우리 순서 정하기',
    points: [
      '오늘 그린 흐름도 위에서 무엇부터 손댈지 순서 정하기',
      'AI 레버리지를 키우려면 로직을 어느 쪽으로 밀어야 하는지',
      '지금 도구로 안 되는 일은 무엇이고, 그때는 어디로 넘어가야 하는지',
    ],
  },
]

export const DEFAULT_CURRICULUM: Record<string, CurriculumBlock[]> = {
  costco: COSTCO_DEFAULT,
}

/**
 * 화면에 그릴 커리큘럼을 가져온다. 서버 컴포넌트/라우트에서만 호출할 것.
 *
 * DB 조회가 실패해도(테이블 미생성, 네트워크 오류 등) 예외를 던지지 않고
 * 코드 기본값으로 떨어진다 — 커리큘럼 하나 때문에 과정 페이지 전체가
 * 죽는 게 더 나쁘기 때문이다.
 */
export async function getCurriculum(courseSlug: string): Promise<CurriculumBlock[]> {
  const fallback = DEFAULT_CURRICULUM[courseSlug] ?? []

  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('course_curriculum')
      .select('time_label, title, scope, points')
      .eq('course_slug', courseSlug)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[curriculum] Supabase error, falling back to code default:', error.message)
      return fallback
    }
    if (!data || data.length === 0) return fallback

    return data.map((row) => ({
      time: row.time_label,
      title: row.title,
      scope: row.scope ?? undefined,
      points: row.points ?? [],
    }))
  } catch (err) {
    console.error('[curriculum] Unexpected error, falling back to code default:', err)
    return fallback
  }
}
