// 강의자료 상세 (/resources/[slug])
//
// 서버 컴포넌트에서 public/materials/*.md 를 읽어 문자열로 넘기고,
// 실제 렌더는 클라이언트 컴포넌트(MarkdownView)가 담당한다.
// (코드블록 복사 버튼처럼 상호작용이 필요해서 렌더러만 클라이언트)
//
// generateStaticParams + dynamicParams=false 로 빌드 시점에 정적 생성한다.
// → 파일 읽기가 빌드 때 끝나므로 배포 환경의 파일시스템 접근에 의존하지 않는다.
// ⚠️ 그래서 .md 본문을 교체하면 반드시 재빌드/재배포해야 반영된다.

import fs from 'fs/promises'
import path from 'path'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { MATERIALS, getMaterial, materialPublicPath } from '@/lib/materials'
import { findMasterPrompt, MASTER_PROMPT_ANCHOR } from '@/lib/markdown-prompt'
import MarkdownView from '../MarkdownView'

export const dynamicParams = false

export function generateStaticParams() {
  return MATERIALS.map((m) => ({ slug: m.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const material = getMaterial(slug)
  if (!material) return { title: '자료를 찾을 수 없습니다' }
  return {
    title: `${material.title} | Claude Code 스터디`,
    description: material.description,
  }
}

async function readMarkdown(file: string): Promise<string | null> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'materials', file)
    return await fs.readFile(filePath, 'utf-8')
  } catch (err) {
    console.error('[resources] markdown read failed:', file, err)
    return null
  }
}

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const material = getMaterial(slug)
  if (!material) notFound()

  const markdown = await readMarkdown(material.file)

  // 마스터 프롬프트가 있는 자료면 상단 CTA 에 "바로가기" 버튼을 띄운다.
  // (판별 로직은 렌더러와 동일한 lib/markdown-prompt.ts 를 공유)
  const hasMasterPrompt = markdown ? findMasterPrompt(markdown) !== null : false

  return (
    <main className="min-h-screen bg-canvas text-fg px-6 py-16">
      <div className="w-full max-w-3xl mx-auto">
        {/* 상단 네비 */}
        <div className="mb-6">
          <Link
            href="/resources"
            className="inline-flex items-center gap-1.5 text-sm text-muted-2 hover:text-text-secondary transition-colors"
          >
            ← 강의자료
          </Link>
        </div>

        {/* 헤더 + 다운로드 */}
        <header className="mb-8 pb-6 border-b border-line">
          <div className="flex items-center gap-2 mb-3">
            {material.badge && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand/20 border border-accent/40 text-accent">
                {material.badge}
              </span>
            )}
            <span className="text-xs text-muted-2">Session {material.session}</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3">
            {material.title}
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed mb-6">
            {material.description}
          </p>

          {/* 시작 안내 CTA — 페이지에 들어오자마자 "뭘 하면 되는지"가 보이게 */}
          <div className="rounded-2xl border border-accent/40 bg-brand/10 p-5">
            {hasMasterPrompt && (
              <ol className="space-y-2 mb-5">
                {[
                  <>
                    터미널에서{' '}
                    <code className="font-mono text-[0.875em] px-1.5 py-0.5 rounded-md bg-surface-strong border border-line text-accent">
                      claude
                    </code>{' '}
                    실행
                  </>,
                  <>아래 마스터 프롬프트 전체 복사</>,
                  <>Claude Code에 붙여넣고 대화 시작</>,
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                    <span className="shrink-0 flex items-center justify-center w-5 h-5 mt-0.5 rounded-full bg-brand text-white text-[11px] font-bold">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            )}

            <div className="flex flex-wrap gap-3">
              {hasMasterPrompt && (
                <a
                  href={`#${MASTER_PROMPT_ANCHOR}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand hover:bg-accent-hover text-white font-semibold text-sm transition-colors shadow-lg shadow-brand/25"
                >
                  ⬇ 마스터 프롬프트로 바로가기
                </a>
              )}
              <a
                href={materialPublicPath(material)}
                download={material.file}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface border border-line text-text-secondary hover:bg-surface-strong font-medium text-sm transition-colors"
              >
                📥 .md 파일 다운로드
              </a>
            </div>
          </div>
        </header>

        {/* 본문 */}
        {markdown === null ? (
          <div className="text-center py-16">
            <p className="text-muted-2 mb-4">
              자료 파일을 불러오지 못했습니다. ({material.file})
            </p>
            <Link href="/resources" className="text-accent hover:text-accent-hover text-sm">
              목록으로 돌아가기 →
            </Link>
          </div>
        ) : (
          <article>
            <MarkdownView markdown={markdown} />
          </article>
        )}

        {/* 하단 네비 */}
        <div className="mt-16 pt-6 border-t border-line flex items-center justify-between text-sm">
          <Link
            href="/resources"
            className="text-muted-2 hover:text-text-secondary transition-colors"
          >
            ← 다른 자료 보기
          </Link>
          <Link href="/board" className="text-accent hover:text-accent-hover transition-colors">
            공유 게시판 →
          </Link>
        </div>
      </div>
    </main>
  )
}
