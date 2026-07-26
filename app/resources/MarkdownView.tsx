'use client'

// 강의자료 마크다운 렌더러.
//
// 보안 원칙:
//   - rehype-raw 등 raw HTML 플러그인을 쓰지 않는다. 따라서 마크다운 안에
//     <script> 같은 HTML 이 있어도 실행되지 않고 무시/이스케이프된다.
//   - dangerouslySetInnerHTML 을 쓰지 않는다.
//
// 렌더 방침:
//   - remark-gfm 으로 표 / 체크리스트 / 취소선 지원.
//   - 코드블록은 복사 버튼 포함.
//   - "마스터 프롬프트" 블록 하나는 완전히 다른 스타일로 크게 강조한다.
//     (판별 로직은 lib/markdown-prompt.ts — 마커 우선, 없으면 가장 긴 블록)
//   - 외부 링크(http/https)는 새 탭, 문서 내부 앵커(#)는 같은 페이지 스크롤 이동.
//   - 표는 가로 스크롤 컨테이너로 감싸 모바일에서 레이아웃이 깨지지 않게 한다.

import { useMemo, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { findMasterPrompt, slugifyHeading, MASTER_PROMPT_ANCHOR } from '@/lib/markdown-prompt'

// hast 노드에서 순수 텍스트만 뽑아낸다 (코드블록 복사 / 헤딩 슬러그용).
type HastNode = { type?: string; value?: string; children?: HastNode[] }

function nodeToText(node: HastNode | undefined): string {
  if (!node) return ''
  if (node.type === 'text') return node.value ?? ''
  if (Array.isArray(node.children)) return node.children.map(nodeToText).join('')
  return ''
}

// 코드블록의 언어 라벨 추출 (className="language-bash" → "bash")
function nodeToLanguage(node: HastNode | undefined): string {
  const code = node?.children?.find((c) => (c as { tagName?: string }).tagName === 'code') as
    | { properties?: { className?: string[] | string } }
    | undefined
  const className = code?.properties?.className
  const list = Array.isArray(className) ? className : className ? [className] : []
  const hit = list.find((c) => typeof c === 'string' && c.startsWith('language-'))
  const lang = hit ? hit.replace('language-', '') : ''
  // master-prompt 는 언어가 아니라 마커이므로 라벨로 쓰지 않는다.
  return /master[-_]?prompt/i.test(lang) ? '' : lang
}

// ─────────────────────────────────────────────────────────
// 일반 코드블록
// ─────────────────────────────────────────────────────────
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const ok = await copyText(code)
    setCopied(ok)
    if (ok) setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="my-5">
      <div className="flex items-center justify-between px-4 py-2 bg-panel border border-line border-b-0 rounded-t-xl">
        <span className="text-[11px] uppercase tracking-widest text-muted-2">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-[11px] px-2.5 py-1 rounded-full bg-surface border border-line text-muted hover:bg-surface-strong hover:text-fg transition-colors"
          aria-label="코드 복사"
        >
          {copied ? '✓ 복사됨' : '복사'}
        </button>
      </div>
      <pre className="overflow-x-auto bg-panel border border-line rounded-b-xl px-4 py-4 text-sm leading-relaxed">
        <code className="font-mono text-text-secondary">{code}</code>
      </pre>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// 마스터 프롬프트 블록 — 이 페이지에서 가장 눈에 띄어야 하는 요소
//
// 접힘 처리: 프롬프트가 길기 때문에 기본은 최대 높이 제한 + 아래쪽 페이드.
// ⚠️ 중요: 복사 버튼은 접혀 있어도 항상 `code` 전체를 복사한다.
//    (화면에 보이는 만큼이 아니라 원본 문자열을 그대로 clipboard 에 넣는다)
// ─────────────────────────────────────────────────────────
function MasterPromptBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const lineCount = code.split('\n').length

  const handleCopy = async () => {
    // 접힘 상태와 무관하게 항상 전체 원본을 복사한다.
    const ok = await copyText(code)
    setCopied(ok)
    setCopyFailed(!ok)
    if (ok) setTimeout(() => setCopied(false), 3000)
  }

  return (
    <section
      id={MASTER_PROMPT_ANCHOR}
      className="my-8 scroll-mt-6 rounded-2xl border-2 border-accent/60 bg-brand/10 overflow-hidden"
    >
      {/* 헤더 — 라벨 배지 + 큰 복사 버튼 */}
      <div className="px-5 py-4 border-b border-accent/30 bg-brand/15">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-brand text-white">
              🚀 마스터 프롬프트
            </span>
            <p className="text-xs text-text-secondary mt-2 leading-relaxed">
              아래 내용을 통째로 복사해 Claude Code에 붙여넣으세요. ({lineCount}줄)
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 px-6 py-3 rounded-full bg-brand hover:bg-accent-hover text-white font-semibold text-sm transition-colors shadow-lg shadow-brand/25"
          >
            {copied ? '✓ 복사됨' : '📋 전체 복사'}
          </button>
        </div>

        {/* 복사 피드백 */}
        {copied && (
          <p className="mt-3 text-sm text-accent">
            복사됐어요! Claude Code에 붙여넣으세요.
          </p>
        )}
        {copyFailed && (
          <p className="mt-3 text-sm text-error">
            자동 복사에 실패했어요. 아래 내용을 직접 드래그해서 복사해 주세요.
          </p>
        )}
      </div>

      {/* 본문 — 접힘 상태에서는 최대 높이 제한 + 페이드 */}
      <div className="relative">
        <pre
          className={`overflow-x-auto overflow-y-auto bg-panel px-5 py-4 text-sm leading-relaxed ${
            expanded ? 'max-h-[70vh]' : 'max-h-64'
          }`}
        >
          <code className="font-mono text-text-secondary">{code}</code>
        </pre>

        {!expanded && (
          // 접혀 있을 때 아래쪽 페이드 — 내용이 더 있다는 신호
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-panel to-transparent" />
        )}
      </div>

      {/* 접기/펼치기 토글 */}
      <div className="px-5 py-3 border-t border-accent/30 bg-brand/15 text-center">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-accent hover:text-accent-hover transition-colors"
        >
          {expanded ? '▲ 접기' : '▼ 전체 보기'}
        </button>
      </div>
    </section>
  )
}

// 클립보드 복사. http 환경/권한 문제로 실패할 수 있어 성공 여부를 돌려준다.
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// 하이픈 정규화 — 앵커 폴백 비교용.
function normalizeAnchor(s: string): string {
  return s.replace(/-+/g, '-').replace(/^-|-$/g, '')
}

/**
 * 앵커 id 로 실제 헤딩 엘리먼트를 찾는다.
 * 1차: 정확히 일치하는 id
 * 2차(폴백): 하이픈 개수/앞뒤 하이픈만 다른 헤딩
 *   → 자료 작성자가 목차를 손으로 쓰면서 GitHub 규칙과 미세하게 어긋나도
 *     목차가 죽지 않게 하기 위한 안전망.
 */
function resolveAnchorTarget(rawId: string): HTMLElement | null {
  const direct = document.getElementById(rawId)
  if (direct) return direct

  const target = normalizeAnchor(rawId)
  const headings = document.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id]')
  for (const h of headings) {
    if (normalizeAnchor(h.id) === target) return h
  }
  return null
}

// 문서 내부 앵커 클릭 — 새 탭이 아니라 같은 페이지에서 스크롤 이동.
function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  const id = decodeURIComponent(href.slice(1))
  const el = resolveAnchorTarget(id)
  if (!el) return // 대상이 없으면 브라우저 기본 동작에 맡긴다
  e.preventDefault()
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  window.history.replaceState(null, '', `#${el.id || id}`)
}

// 헤딩 컴포넌트 팩토리 — GitHub 스타일 슬러그를 id 로 부여해 목차 앵커가 동작하게.
function heading(Tag: 'h1' | 'h2' | 'h3' | 'h4', className: string) {
  return function Heading({ node, children }: { node?: unknown; children?: ReactNode }) {
    const id = slugifyHeading(nodeToText(node as HastNode))
    return (
      <Tag id={id || undefined} className={`scroll-mt-6 ${className}`}>
        {children}
      </Tag>
    )
  }
}

export default function MarkdownView({ markdown }: { markdown: string }) {
  // 마스터 프롬프트 후보를 미리 한 번만 계산해 두고, 각 코드블록 렌더 시
  // 내용이 일치하는지 비교한다. (문서 구조 하드코딩 없이 판별)
  const masterPrompt = useMemo(() => findMasterPrompt(markdown), [markdown])

  return (
    <div className="text-text-secondary">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: heading(
            'h1',
            'text-2xl md:text-3xl font-semibold tracking-tight text-fg mt-10 mb-4 first:mt-0'
          ),
          h2: heading(
            'h2',
            'text-xl md:text-2xl font-semibold tracking-tight text-fg mt-10 mb-3 pb-2 border-b border-line'
          ),
          h3: heading('h3', 'text-lg font-semibold tracking-tight text-fg mt-8 mb-2'),
          h4: heading('h4', 'text-base font-semibold text-fg mt-6 mb-2'),
          p: ({ children }) => (
            <p className="text-[15px] leading-[1.75] my-4 break-words">{children}</p>
          ),
          a: ({ href, children }) => {
            // 문서 내부 앵커 — 같은 페이지 스크롤 이동 (새 탭 아님)
            if (href && href.startsWith('#')) {
              return (
                <a
                  href={href}
                  onClick={(e) => handleAnchorClick(e, href)}
                  className="text-accent hover:text-accent-hover underline underline-offset-2"
                >
                  {children}
                </a>
              )
            }
            // 외부 링크 — 새 탭. http/https 만 허용해 javascript: 등은 링크로 만들지 않는다.
            if (isExternalHref(href)) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-hover underline underline-offset-2 break-all"
                >
                  {children}
                </a>
              )
            }
            // 사이트 내부 상대경로는 같은 탭
            if (href && href.startsWith('/')) {
              return (
                <a
                  href={href}
                  className="text-accent hover:text-accent-hover underline underline-offset-2"
                >
                  {children}
                </a>
              )
            }
            return <span className="text-text-secondary">{children}</span>
          },
          ul: ({ children }) => (
            <ul className="my-4 space-y-2 list-disc pl-5 marker:text-muted-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 space-y-2 list-decimal pl-5 marker:text-muted-2">{children}</ol>
          ),
          li: ({ children }) => <li className="text-[15px] leading-[1.7] pl-1">{children}</li>,
          // GFM 체크리스트 — 읽기 전용으로 보이게 (클릭해도 상태 변경 없음)
          input: ({ checked, type }) =>
            type === 'checkbox' ? (
              <input
                type="checkbox"
                checked={!!checked}
                readOnly
                disabled
                className="mr-2 -ml-5 align-middle accent-brand"
              />
            ) : null,
          blockquote: ({ children }) => (
            <blockquote className="my-5 pl-4 border-l-2 border-accent/50 bg-surface rounded-r-xl py-3 pr-4 text-text-secondary">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-10 border-line" />,
          strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => <del className="text-muted-2 line-through">{children}</del>,
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typeof src === 'string' ? src : ''}
              alt={alt ?? ''}
              className="my-5 max-w-full h-auto rounded-xl border border-line"
            />
          ),
          // 표: 모바일 대응을 위해 가로 스크롤 컨테이너로 감싼다.
          table: ({ children }) => (
            <div className="my-6 -mx-1 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface">{children}</thead>,
          th: ({ children }) => (
            <th className="text-left font-semibold text-fg px-4 py-2.5 border border-line whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 border border-line align-top text-text-secondary">
              {children}
            </td>
          ),
          // 코드블록: children 을 그대로 넘기지 않고 hast 노드에서 원문 텍스트를
          // 추출해 직접 렌더한다. 덕분에 아래 `code` 렌더러는 인라인 코드만 담당한다.
          pre: ({ node }) => {
            const text = nodeToText(node as HastNode).replace(/\s+$/, '')

            // 마스터 프롬프트와 내용이 같으면 강조 블록으로 렌더.
            if (masterPrompt && text.trim() === masterPrompt) {
              return <MasterPromptBlock code={text} />
            }

            return <CodeBlock code={text} language={nodeToLanguage(node as HastNode)} />
          },
          code: ({ children }) => (
            <code className="font-mono text-[0.875em] px-1.5 py-0.5 rounded-md bg-surface-strong border border-line text-accent">
              {children}
            </code>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}

// http/https 외부 링크인지.
// (타입 술어(href is string)를 쓰면 else 분기에서 href 가 never 로 좁혀져
//  이후 상대경로 검사가 불가능해지므로 일반 boolean 으로 둔다)
function isExternalHref(href?: string): boolean {
  if (!href) return false
  return /^https?:\/\//i.test(href.trim())
}
