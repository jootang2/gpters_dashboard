// 강의자료 목록 (/resources)
//
// 자료 메타데이터는 lib/materials.ts 한 곳에서만 관리한다.
// 새 자료를 추가하려면 public/materials/ 에 .md 를 넣고 MATERIALS 배열에
// 한 줄 추가하면 이 목록과 상세 페이지가 자동으로 따라온다.

import Link from 'next/link'
import type { Metadata } from 'next'
import { getMaterialsBySession, materialPublicPath } from '@/lib/materials'

export const metadata: Metadata = {
  title: '강의자료 | Claude Code 스터디',
  description: '주차별 강의자료와 추가자료를 웹에서 바로 읽고 .md 파일로 내려받을 수 있습니다.',
}

export default function ResourcesPage() {
  const grouped = getMaterialsBySession()

  return (
    <main className="min-h-screen bg-canvas text-fg px-6 py-16">
      <div className="w-full max-w-2xl mx-auto">
        {/* 상단 네비 */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-2 hover:text-text-secondary transition-colors"
          >
            ← 홈으로
          </Link>
        </div>

        {/* 헤더 */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight mb-2">강의자료</h1>
          <p className="text-text-secondary text-sm">
            주차별 자료를 웹에서 바로 읽고, 원본 마크다운 파일로 내려받을 수 있어요.
          </p>
        </div>

        {grouped.length === 0 ? (
          <p className="text-center text-muted-2 py-16">아직 등록된 자료가 없어요.</p>
        ) : (
          <div className="space-y-10">
            {grouped.map(({ session, items }) => (
              <section key={session}>
                <h2 className="text-xs text-muted uppercase tracking-widest mb-4">
                  Session {session}
                </h2>
                <div className="space-y-3">
                  {items.map((m) =>
                    m.externalPath ? (
                      // externalPath 항목: md 상세 페이지가 없으므로 카드 전체가 바로 그 경로를 새 탭으로 연다.
                      <a
                        key={m.slug}
                        href={m.externalPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block backdrop-blur-sm bg-surface border border-line rounded-2xl p-5 hover:bg-surface-strong transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {m.badge && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand/20 border border-accent/40 text-accent">
                              {m.badge}
                            </span>
                          )}
                          <span className="text-xs text-muted-2">🎬 시각화</span>
                        </div>
                        <p className="text-fg font-medium mb-1.5">{m.title}</p>
                        <p className="text-sm text-text-secondary leading-relaxed">
                          {m.description}
                        </p>

                        <div className="mt-4 pt-3 border-t border-line">
                          <span className="text-xs text-accent">새 탭에서 열기 →</span>
                        </div>
                      </a>
                    ) : (
                      <div
                        key={m.slug}
                        className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-5 hover:bg-surface-strong transition-colors"
                      >
                        <Link href={`/resources/${m.slug}`} className="block">
                          <div className="flex items-center gap-2 mb-2">
                            {m.badge && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand/20 border border-accent/40 text-accent">
                                {m.badge}
                              </span>
                            )}
                            <span className="text-xs text-muted-2">.md</span>
                          </div>
                          <p className="text-fg font-medium mb-1.5">{m.title}</p>
                          <p className="text-sm text-text-secondary leading-relaxed">
                            {m.description}
                          </p>
                        </Link>

                        <div className="mt-4 pt-3 border-t border-line flex items-center gap-4">
                          <Link
                            href={`/resources/${m.slug}`}
                            className="text-xs text-accent hover:text-accent-hover transition-colors"
                          >
                            웹에서 읽기 →
                          </Link>
                          <a
                            href={materialPublicPath(m)}
                            download={m.file}
                            className="text-xs text-muted-2 hover:text-text-secondary transition-colors"
                          >
                            📥 .md 다운로드
                          </a>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
