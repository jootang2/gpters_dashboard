import Link from 'next/link'

export default function CompletePage() {
  return (
    <main className="min-h-screen bg-canvas text-fg flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-12">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-2xl font-semibold tracking-tight mb-4">사전 진단 완료!</h1>
          <p className="text-text-secondary leading-relaxed mb-8">
            소중한 응답 감사합니다.
            <br />
            스터디 시작 전에 개별 안내 드릴게요.
            <br />
            <span className="text-accent font-medium">7월 21일</span>에 만나요 :)
          </p>
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="block w-full py-3 rounded-full bg-brand hover:bg-accent-hover font-semibold transition-colors"
            >
              참여자 현황 보기 →
            </Link>
            <Link
              href="/courses/gpters"
              className="block w-full py-3 rounded-full border border-line text-text-secondary hover:bg-surface-strong transition-colors"
            >
              스터디 홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
