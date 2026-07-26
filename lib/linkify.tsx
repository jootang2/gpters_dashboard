// 본문 텍스트 안의 URL 을 클릭 가능한 하이퍼링크로 바꾸는 헬퍼.
//
// 보안 원칙 (중요):
//   - dangerouslySetInnerHTML 을 절대 쓰지 않는다. 사용자 입력을 HTML 로
//     해석하지 않고, 텍스트를 파싱해 React 엘리먼트 배열로 만들어 렌더한다.
//     따라서 <script> 나 <img onerror=...> 같은 입력은 그냥 글자로 보인다.
//   - http / https 스킴만 링크로 만든다. javascript:, data:, vbscript: 등은
//     정규식 자체가 매칭하지 않으므로 링크가 되지 않고 평문으로 남는다.
//
// 줄바꿈 보존:
//   반환된 배열의 텍스트 조각은 '\n' 을 그대로 담고 있다. 렌더하는 쪽에서
//   `whitespace-pre-wrap` 클래스를 유지하면 줄바꿈이 그대로 보인다.
//   (게시판 본문/댓글이 이미 whitespace-pre-wrap 을 쓰고 있다.)

import type { ReactNode } from 'react'

// http:// 또는 https:// 로 시작하는 연속 문자열.
// 공백과 URL 에서 흔히 쓰이지 않는 괄호/따옴표류는 제외해 과도한 매칭을 막는다.
const URL_REGEX = /https?:\/\/[^\s<>"'`]+/gi

// URL 끝에 붙은 문장부호는 링크에서 제외한다.
// 예) "https://a.com 을 보세요." 에서 마지막 '.' 이나
//     "(https://a.com)" 의 닫는 괄호가 링크에 딸려가지 않도록.
function trimTrailingPunctuation(url: string): { href: string; trailing: string } {
  let end = url.length

  while (end > 0) {
    const ch = url[end - 1]

    if ('.,;:!?"\''.includes(ch)) {
      end -= 1
      continue
    }

    // 닫는 괄호는 여는 괄호와 짝이 맞을 때만 URL 의 일부로 인정한다.
    // (위키 URL 처럼 괄호를 포함하는 주소를 지원하기 위함)
    if (ch === ')' || ch === ']' || ch === '}') {
      const open = ch === ')' ? '(' : ch === ']' ? '[' : '{'
      const candidate = url.slice(0, end)
      const opens = candidate.split(open).length - 1
      const closes = candidate.split(ch).length - 1
      if (closes > opens) {
        end -= 1
        continue
      }
    }

    break
  }

  return { href: url.slice(0, end), trailing: url.slice(end) }
}

/**
 * 평문 텍스트를 받아 URL 부분만 <a> 엘리먼트로 바꾼 ReactNode 배열을 반환한다.
 * 링크는 항상 새 탭에서 열리며 rel="noopener noreferrer" 가 붙는다.
 */
export function linkify(text: string): ReactNode[] {
  if (!text) return []

  const nodes: ReactNode[] = []
  let lastIndex = 0
  let key = 0

  // 정규식이 전역(g)이므로 재사용 시 lastIndex 오염을 피하려고 매번 새로 만든다.
  const regex = new RegExp(URL_REGEX.source, 'gi')
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0]
    const start = match.index

    // URL 앞쪽 평문 (줄바꿈 포함 그대로 보존)
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start))
    }

    const { href, trailing } = trimTrailingPunctuation(raw)

    // 문장부호를 떼고 나니 스킴만 남는 등 실질 URL 이 아니면 평문 처리
    if (href.length <= 'https://'.length) {
      nodes.push(raw)
    } else {
      nodes.push(
        <a
          key={`link-${key++}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover underline underline-offset-2 break-all"
        >
          {href}
        </a>
      )
      if (trailing) nodes.push(trailing)
    }

    lastIndex = start + raw.length
  }

  // 마지막 URL 뒤 남은 평문
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

/**
 * 게시판 본문/댓글용 렌더 컴포넌트.
 * 부모에서 whitespace-pre-wrap 을 주는 대신 여기서 직접 감싸 준다.
 */
export function LinkifiedText({
  text,
  className = '',
}: {
  text: string
  className?: string
}) {
  return <span className={`whitespace-pre-wrap ${className}`}>{linkify(text)}</span>
}
