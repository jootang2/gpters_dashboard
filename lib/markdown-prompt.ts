// 마크다운 문서 안에서 "마스터 프롬프트" 코드블록을 찾아내는 유틸.
//
// 1주차 추가자료는 "읽고 따라하는 문서"가 아니라 "프롬프트 하나를 통째로 복사해
// Claude Code 에 붙여넣으면 미션이 굴러가는 자료"다. 그래서 문서 안의 코드블록
// 하나(그 프롬프트)를 특별히 크게 강조해 렌더해야 한다.
//
// 판별 방식 (문서 구조에 하드코딩하지 않는다 — 본문이 바뀌어도 안 깨지게):
//   1순위. 펜스 info 문자열에 master-prompt 마커가 있으면 그 블록.
//          예)  ```text master-prompt      /  ```master-prompt
//   2순위. 마커가 없으면 문서에서 "가장 긴 코드블록".
//          단 MIN_MASTER_PROMPT_LENGTH 미만이면 마스터 프롬프트가 없는 문서로 본다
//          (짧은 bash 예제만 있는 문서에서 엉뚱한 블록이 강조되는 걸 막기 위함).
//
// 서버 컴포넌트(page.tsx)와 클라이언트 렌더러(MarkdownView) 양쪽에서 쓰므로
// React 의존성 없는 순수 함수로 둔다.

/** 이 길이 미만이면 "마스터 프롬프트"로 승격하지 않는다. */
export const MIN_MASTER_PROMPT_LENGTH = 200

/** 강조 블록에 붙는 DOM id — 상단 CTA 의 "바로가기" 앵커 타겟. */
export const MASTER_PROMPT_ANCHOR = 'master-prompt'

export type Fence = {
  /** 펜스 뒤 info 문자열 (예: "bash", "text master-prompt") */
  info: string
  /** 코드 본문 (앞뒤 개행 정리됨) */
  code: string
}

/**
 * 줄머리의 인용문 마커(`> `, `>> ` …)를 벗겨낸다.
 * 인용문 안에 들어 있는 코드블록도 인식하기 위한 전처리.
 */
function stripQuoteMarker(line: string): string {
  return line.replace(/^\s*(?:>\s?)+/, '')
}

/**
 * 마크다운에서 펜스 코드블록(``` 또는 ~~~)을 순서대로 뽑아낸다.
 * 정규식 한 방 대신 줄 단위로 훑어서 중첩/들여쓰기 케이스에 덜 취약하게 처리.
 *
 * 인용문 안의 펜스(`> ```)도 잡는다 — 이렇게 해야 remark(실제 렌더러)가 보는
 * 코드블록 목록과 개수가 일치한다. 단 인용문 밖에서 열린 펜스의 본문은 절대
 * 건드리지 않는다(프롬프트 본문에 '>' 로 시작하는 줄이 있어도 그대로 보존).
 */
export function parseFences(markdown: string): Fence[] {
  const fences: Fence[] = []
  const lines = markdown.split('\n')

  let inFence = false
  let fenceChar = ''
  let fenceLen = 0
  let info = ''
  let quoted = false // 여는 펜스가 인용문 안이었는지
  let buffer: string[] = []

  for (const rawLine of lines) {
    // 펜스 밖에서는 인용문 마커를 벗겨 판정하고,
    // 펜스 안에서는 그 펜스가 인용문 안에서 열렸을 때만 벗긴다.
    const line = inFence ? (quoted ? stripQuoteMarker(rawLine) : rawLine) : stripQuoteMarker(rawLine)
    const match = line.match(/^\s*(`{3,}|~{3,})(.*)$/)

    if (!inFence) {
      if (match) {
        inFence = true
        fenceChar = match[1][0]
        fenceLen = match[1].length
        info = match[2].trim()
        // 이 펜스가 인용문 안에서 열렸는지 기억해 둔다 (본문/닫는 펜스 처리 기준)
        quoted = stripQuoteMarker(rawLine) !== rawLine
        buffer = []
      }
      continue
    }

    // 펜스 안 — 같은 문자로 시작하고 길이가 여는 펜스 이상이면 닫는 펜스로 본다.
    const isClosing =
      match && match[1][0] === fenceChar && match[1].length >= fenceLen && match[2].trim() === ''

    if (isClosing) {
      fences.push({ info, code: buffer.join('\n').replace(/\s+$/, '') })
      inFence = false
      continue
    }

    buffer.push(line)
  }

  // 닫히지 않은 펜스도 살려 준다 (문서가 잘려도 프롬프트는 보이게)
  if (inFence && buffer.length > 0) {
    fences.push({ info, code: buffer.join('\n').replace(/\s+$/, '') })
  }

  return fences
}

/** info 문자열에 마스터 프롬프트 마커가 있는지 */
function hasMasterMarker(info: string): boolean {
  return /master[-_ ]?prompt/i.test(info)
}

/**
 * 마스터 프롬프트로 볼 코드블록의 본문을 반환한다. 없으면 null.
 * (렌더러는 이 문자열과 코드블록 내용을 비교해 강조 여부를 결정한다)
 */
export function findMasterPrompt(markdown: string): string | null {
  const fences = parseFences(markdown)
  if (fences.length === 0) return null

  // 1순위: 명시적 마커
  const marked = fences.find((f) => hasMasterMarker(f.info))
  if (marked && marked.code.trim()) return marked.code.trim()

  // 2순위: 가장 긴 블록
  const longest = fences.reduce((a, b) => (b.code.length > a.code.length ? b : a))
  if (longest.code.trim().length < MIN_MASTER_PROMPT_LENGTH) return null

  return longest.code.trim()
}

/**
 * GitHub(github-slugger) 호환 헤딩 슬러그.
 *
 * ⚠️ 이 함수는 "예쁜 슬러그"를 만드는 게 목적이 아니라, 자료 작성자가
 *    GitHub 기준으로 써 놓은 목차 앵커(`](#부록-a--막힐-때-...)`)와
 *    **정확히 일치**하는 게 목적이다. 그래서 아래 두 가지를 일부러 하지 않는다:
 *
 *    1. 연속 하이픈을 합치지 않는다.
 *       "부록 A — 막힐 때" 에서 em dash 가 사라지면 공백이 2개 남고,
 *       GitHub 은 이를 하이픈 2개로 만든다 → `부록-a--막힐-때`
 *    2. 앞뒤 하이픈을 잘라내지 않는다.
 *       "🚀 여기부터 …" 처럼 이모지로 시작하면 이모지가 제거되며 앞 공백이 남아
 *       GitHub 슬러그는 하이픈으로 시작한다 → `-여기부터-…`
 *
 *    이 둘을 "정리"하면 이모지 헤딩과 em dash 헤딩의 목차 링크가 전부 깨진다.
 *    (실제로 1주차 자료 앵커 11개 중 6개가 이 이유로 깨졌던 이력이 있다)
 *
 * 유지 규칙: 소문자화 → 문자/숫자/공백/하이픈/언더스코어만 남김 → 공백을 하이픈으로.
 * 한글은 \p{L} 에 포함되므로 그대로 보존된다.
 */
export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '') // 문장부호/이모지/기호 제거 (공백은 남긴다)
    .replace(/\s/g, '-') // 공백 1개 → 하이픈 1개 (합치지 않음)
}
