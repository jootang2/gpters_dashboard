# DESIGN.md — Claude Code 스터디 페이지

> 이 문서는 **현재 코드에 실제로 존재하는 값**만 기록한다. 이상적인 디자인 시스템이나
> 외부 레퍼런스를 새로 이식한 내용이 아니다. 애매하거나 코드로 확인 안 되는 항목은
> 8절 "확인 불가"에 솔직히 남겼다. 새 화면을 만들 때는 여기 적힌 실제 className을
> 그대로 재사용하면 기존 화면과 이질감이 없어야 한다.

## 1. 개요

다크 배경 전용(라이트 모드 없음)의 근흑(near-black) 캔버스 위에 인디고 브랜드 컬러
하나만 절제해서 쓰고, 나머지는 반투명 흰색 표면/보더로 위계를 만드는 디자인이다.
카드는 전부 유리모피즘(`backdrop-blur` + 반투명 화이트 배경 + 얇은 보더)이고, 버튼과
뱃지는 전부 완전한 pill(`rounded-full`) 형태다. "입문자 대상 스터디"라는 성격에 맞춰
카드 radius는 `rounded-2xl`(12~16px 급)로 넉넉하게 잡아 차갑지 않게 조정했다.

토큰은 Tailwind v4의 `@theme` 블록(`app/globals.css`)에 CSS 커스텀 프로퍼티로 정의돼
있고, 모든 페이지가 이 한 곳만 참조한다(색상 하드코딩 대신 `bg-canvas`, `text-fg`,
`border-line` 같은 유틸리티 클래스 사용). 단, 대시보드 카테고리 차트 팔레트는 예외이며
3절에서 별도로 설명한다.

## 2. 색상

`app/globals.css`의 `@theme inline` 블록에 정의됨. **별도 tailwind.config 파일은 없다
(Tailwind v4라 설정이 CSS 안에 있음)**.

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-canvas` | `#14161a` | 페이지 배경 (`bg-canvas`) |
| `--color-panel` | `#1c1f24` | select 등 서브 패널 배경 (`bg-panel`) — 예: `app/survey/page.tsx` 나이대 select |
| `--color-surface` | `rgba(255,255,255,.06)` | 카드/입력창 배경 (`bg-surface`) |
| `--color-surface-strong` | `rgba(255,255,255,.10)` | hover/active 배경 (`bg-surface-strong`) |
| `--color-fg` | `#f7f8f8` | 기본 텍스트 (`text-fg`) |
| `--color-text-secondary` | `#d0d6e0` | 본문/설명 텍스트 (`text-text-secondary`) |
| `--color-muted` | `#8a8f98` | placeholder, 라벨, 캡션 (`text-muted`) |
| `--color-muted-2` | `#6e727a` | 타임스탬프 등 최저 위계 텍스트 (`text-muted-2`) |
| `--color-brand` | `#5e6ad2` | 프라이머리 CTA 배경 (`bg-brand`) |
| `--color-accent` | `#7170ff` | 링크, 강조 텍스트 (`text-accent`) |
| `--color-accent-hover` | `#828fff` | 버튼/링크 hover (`hover:bg-accent-hover`, `hover:text-accent-hover`) |
| `--color-line` | `rgba(255,255,255,.10)` | 기본 보더 (`border-line`) |
| `--color-line-subtle` | `rgba(255,255,255,.06)` | 더 옅은 보더, 표 구분선 (`divide-line-subtle`) |
| `--color-error` | `#ff4b4b` | 에러/검증 실패 (`text-error`, `bg-error/10`, `border-error/20`) |
| `--background` / `--foreground` | `#14161a` / `#f7f8f8` | canvas/fg와 동일 값, `<body>` 기본 배경·글자색용 별도 변수 |

라이트/다크 테마 전환 로직 없음 — `prefers-color-scheme` 미디어쿼리도, 테마 토글도
코드에 없다. 다크 전용 고정 팔레트다.

**예외 — 대시보드 카테고리 차트 (`app/dashboard/page.tsx`)**: 파이/바 차트 색상은
토큰을 쓰지 않고 별도 8색 hex 배열(`COLORS`)을 직접 정의해 쓴다. 코드 주석에 따르면
"데이터 시각화 가독성을 위해 기존 다색 팔레트를 유지하고 브랜드 인디고를 첫 번째
색으로만 승격 — 전부 인디고 단색으로 바꾸면 카테고리 구분이 어려워지므로 의도적으로
유지"한 것. 값: `#3987e5`(blue), `#008300`(green), `#d55181`(magenta), `#c98500`(yellow),
`#199e70`(aqua), `#d95926`(orange), `#9085e9`(violet), `#e66767`(red). 값 이름(카테고리)과
색 인덱스를 고정 매핑(`CATEGORY_OPTION_ORDER`)해 필터링돼도 같은 항목은 항상 같은
색을 유지하도록 설계돼 있다 — 이 구조를 건드릴 땐 이 매핑도 함께 갱신해야 한다.

## 3. 타이포그래피

- 본문/제목 폰트: **Inter** (`next/font/google`, `app/layout.tsx`). weight `400/500/600/700`만
  로드(`weight: ["400","500","600","700"]`), CSS 변수 `--font-inter`.
- 모노스페이스 폰트: **Geist Mono** (`next/font/google`), CSS 변수 `--font-geist-mono`
  (`--font-mono` 토큰에 매핑). 코드 조각(예: `resources/[slug]/page.tsx`의 `<code>` 터미널
  명령어 표기)에 사용.
- `body`의 `font-family`: `var(--font-inter), -apple-system, "Noto Sans KR", Arial, Helvetica, sans-serif`
- `body`: `letter-spacing: -0.01em`
- `h1, h2, h3`: `letter-spacing: -0.02em` (전역 CSS, `app/globals.css`)
- 실제 쓰이는 크기/굵기 조합 (className 그대로):
  - 히어로 h1: `text-4xl md:text-5xl font-semibold tracking-tight leading-tight` (`app/page.tsx`)
  - 페이지 h1: `text-3xl font-semibold tracking-tight` (`app/board/page.tsx`, `app/resources/page.tsx`, `app/dashboard/page.tsx`)
  - 자료 상세 h1: `text-2xl md:text-3xl font-semibold tracking-tight` (`app/resources/[slug]/page.tsx`)
  - 섹션 h2: `text-2xl font-semibold tracking-tight` (`app/page.tsx` "스터디 개요"/"커리큘럼")
  - 카드/스텝 소제목: `text-xl font-semibold tracking-tight` (`app/survey/page.tsx` Step 헤더), `text-lg font-semibold` (admin 섹션 h2)
  - 본문: `text-text-secondary` 계열, 보통 `text-sm` 또는 `text-lg md:text-xl leading-relaxed`(히어로 서브텍스트)
  - 캡션/라벨: `text-xs text-muted`, 최저 위계는 `text-xs text-muted-2`

## 4. 간격·레이아웃

- 페이지 wrapper 공통 패턴: `min-h-screen bg-canvas text-fg px-6 py-16` (내부 콘텐츠 페이지 대부분),
  대시보드/어드민은 `py-12`.
- 컨테이너 max-width는 페이지 성격에 따라 다르며 통일된 하나의 값이 아니다 (실제 사용값):
  - `max-w-3xl` — 홈 히어로(`app/page.tsx`), 자료 상세(`app/resources/[slug]/page.tsx`)
  - `max-w-4xl` — 홈 "스터디 개요" 섹션
  - `max-w-2xl` — `/board`, `/resources` 목록
  - `max-w-xl` — `/survey` 폼 카드
  - `max-w-md` — `/survey/complete`, 대시보드 empty/error 상태 카드
  - `max-w-5xl` — `/dashboard` 본문
  - `max-w-6xl` — `/admin` 본문
  - `max-w-sm` — 어드민 로그인 카드
  - 전부 `mx-auto`와 함께 사용.
- 카드 padding: 강조도에 따라 `p-5`(목록 아이템) / `p-6`(일반 카드) / `p-8`(폼/모달) / `p-12`(빈 상태 큰 카드).
- radius 체계: `rounded-2xl`(카드/모달), `rounded-full`(버튼·뱃지·pill·토글), `rounded-xl`(입력창), `rounded-lg`(작은 에러박스).
- 반응형 브레이크포인트: 코드 전체에서 **`sm:`, `md:` 두 개만 사용**됨. `lg:`, `xl:` 사용
  없음 (grep으로 `app/` 전체 확인). 대표 예: `grid grid-cols-2 md:grid-cols-4`(홈 개요 카드),
  `text-4xl md:text-5xl`(히어로 제목).

## 5. 컴포넌트 패턴

실제 코드에서 반복되는 className을 그대로 인용. 새 컴포넌트를 만들 때 이 문자열을
그대로 붙여쓰면 기존 화면과 맞는다.

**카드 (유리모피즘)**
```
backdrop-blur-sm bg-surface border border-line rounded-2xl p-6
```
출처: `app/page.tsx`(개요/커리큘럼 카드), `app/dashboard/page.tsx`, `app/admin/page.tsx`.
클릭 가능한 목록 카드는 hover 배경이 붙는다:
```
backdrop-blur-sm bg-surface border border-line rounded-2xl p-5 hover:bg-surface-strong transition-colors
```
출처: `app/resources/page.tsx`, `app/board/page.tsx` (게시글 리스트 아이템, `Link`에 직접 적용).

모달은 `backdrop-blur-sm` 대신 `backdrop-blur`(sm 접미사 없음)를 쓴다:
```
relative w-full max-w-md bg-surface backdrop-blur border border-line rounded-2xl p-8
```
출처: `app/page.tsx` `MaterialModal`.

**버튼 — Primary (pill, 브랜드 색)**
```
px-8 py-4 text-lg font-semibold rounded-full bg-brand hover:bg-accent-hover transition-colors duration-200 shadow-lg shadow-brand/25
```
출처: `app/page.tsx` 히어로 CTA("사전 진단하기 →"). 폼 제출 버튼처럼 덜 강조된 곳은:
```
py-3 rounded-full bg-brand hover:bg-accent-hover font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed
```
출처: `app/survey/page.tsx`, `app/board/page.tsx`, `app/admin/page.tsx` 로그인 버튼.

**버튼 — Secondary/Ghost**
```
flex-1 py-3 rounded-full border border-line text-text-secondary hover:bg-surface-strong transition-colors
```
출처: `app/survey/page.tsx`("이전"), `app/survey/complete/page.tsx`("홈으로 돌아가기").
좀 더 작은 secondary 버튼(다운로드 등):
```
inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface border border-line text-text-secondary hover:bg-surface-strong font-medium text-sm transition-colors
```
출처: `app/resources/[slug]/page.tsx`(".md 파일 다운로드" 버튼).

**입력 필드**
```
w-full px-4 py-3 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent transition-colors
```
출처: `app/survey/page.tsx`, `app/board/page.tsx` (텍스트/textarea input 전부 동일). select
요소는 배경만 `bg-panel`로 바뀐다:
```
w-full px-4 py-3 rounded-xl bg-panel border border-line text-fg focus:outline-none focus:border-accent transition-colors
```
출처: `app/survey/page.tsx` Step1 나이대 select.

**뱃지/pill**
- 히어로 eyebrow: `inline-block px-3 py-1 mb-6 text-sm font-medium rounded-full bg-surface border border-line text-accent` (`app/page.tsx`)
- 작은 태그(자료 뱃지 등): `text-[11px] px-2 py-0.5 rounded-full bg-brand/20 border border-accent/40 text-accent` (`app/resources/page.tsx`, `app/resources/[slug]/page.tsx`)

**에러 메시지 박스**
```
text-sm text-error bg-error/10 border border-error/20 rounded-lg px-4 py-3
```
출처: `app/survey/page.tsx`, `app/board/page.tsx`.

**"뒤로 가기" 상단 네비 링크** (여러 페이지에서 동일 문구 패턴 반복)
```
inline-flex items-center gap-1.5 text-sm text-muted-2 hover:text-text-secondary transition-colors
```
출처: `app/resources/page.tsx`, `app/board/page.tsx`, `app/board/[id]/page.tsx`, `app/survey/page.tsx`,
`app/dashboard/page.tsx`, `app/resources/[slug]/page.tsx`. 전부 "← 홈으로" / "← 강의자료" 형태.

**토글 스위치 (어드민 전용)**
```
relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors
```
+ 상태에 따라 `bg-brand`/`bg-surface-strong`, 내부 노브는
`inline-block h-4 w-4 transform rounded-full bg-white transition-transform` + `translate-x-4`/`translate-x-0`.
출처: `app/admin/page.tsx` (대시보드 공개 설정, 응답별 대시보드 포함 여부).

**다크/라이트 테마 처리**: 없음. 모든 페이지가 `bg-canvas text-fg`를 명시적으로 깔고
시작하며 조건 분기가 없다.

## 6. 페이지별 구조 요약

| 라우트 | 파일 | 타입 | 구조 요약 |
|---|---|---|---|
| `/` | `app/page.tsx` | client | 히어로(GPTers×Claude Code 뱃지, h1, CTA) + 스터디 개요 카드(2/4열 grid) + 커리큘럼 리스트 + footer. 세션별 "추가 자료" 버튼 클릭 시 자료 있으면 링크, 없으면 준비중 모달(`MaterialModal`) |
| `/survey` | `app/survey/page.tsx` | client | 3-step 위저드, `max-w-xl` 카드 안에 진행바 + `Step1`/`Step2`/`Step3` 서브컴포넌트. 제출 시 Supabase `survey_responses` insert 후 `/survey/complete`로 이동 |
| `/survey/complete` | `app/survey/complete/page.tsx` | server (no `'use client'`) | 중앙 정렬 성공 카드 하나, 대시보드/홈 링크 2개 |
| `/dashboard` | `app/dashboard/page.tsx` | client | `/api/dashboard-summary` fetch → 총 응답수 카드 + recharts Pie(카테고리)/Bar(배열형) 차트 grid + `TextSlider` 카드(텍스트 응답 슬라이드). loading/빈 데이터/에러 상태 각각 별도 중앙 카드 렌더 |
| `/board` | `app/board/page.tsx` | client | Supabase `posts` 목록(카드 리스트) + 상단 "새 글" 토글 폼(PIN 필수) + 기존 PIN 안내 배너 |
| `/board/[id]` | `app/board/[id]/page.tsx` | client, `use(params)` | 게시글 상세 + 댓글 목록/작성 + PIN 기반 인라인 수정/삭제 상태 다수 |
| `/resources` | `app/resources/page.tsx` | server | `lib/materials.ts`의 `MATERIALS`를 세션별로 그룹핑해 카드 리스트. `externalPath` 항목은 카드 전체가 새 탭 외부링크, 아니면 상세 페이지 링크 |
| `/resources/[slug]` | `app/resources/[slug]/page.tsx` | server, `await params`, SSG | `generateStaticParams` + `dynamicParams=false`로 빌드 시점에 `public/materials/*.md`를 읽어 정적 생성. 렌더는 클라이언트 `MarkdownView` 컴포넌트가 담당 |
| `/admin` | `app/admin/page.tsx` | client | Supabase Auth(email/password) 로그인 게이트 → 대시보드 공개 필드 토글 + 전체 응답 테이블(가로 스크롤, 대시보드 포함 여부 토글) |

## 7. 작업 규칙

코드 주석/구조에서 실제로 도출된 규칙만 적었다.

- **자료(강의자료) 추가**: `public/materials/` 에 `.md` 파일을 넣고, `lib/materials.ts`의
  `MATERIALS` 배열에 항목 하나를 추가하면 목록/상세/다운로드가 자동으로 따라온다.
  `slug`(URL)와 `file`(실제 파일명)을 분리해 둔 이유는 나중에 파일명을 바꿔도 이미
  공유된 URL이 깨지지 않게 하기 위함.
- **`externalPath` 항목** (md 문서가 아니라 외부/정적 HTML로 바로 보내는 카드, 예:
  `/viz/agent-structure.html`): `file`을 비워둔다(존재하지 않는 파일명을 지어내면 다운로드
  링크가 404가 남). `/resources/[slug]` 상세 페이지는 생성되지 않으며
  `generateStaticParams`에서도 제외된다. 목록에서 카드를 클릭하면 새 탭으로
  `externalPath`가 바로 열린다.
- **`/resources/[slug]`는 SSG다**(`dynamicParams = false` + `generateStaticParams`). `.md`
  본문을 수정해도 로컬 파일만 바뀐 것이고, 실제 반영되려면 **반드시 재빌드/재배포**해야
  한다.
- **Next.js 15/16의 `params`는 `Promise<{...}>`**: 서버 컴포넌트(`resources/[slug]/page.tsx`)는
  `await params`, 클라이언트 컴포넌트(`board/[id]/page.tsx`)는 `use(params)`를 쓴다.
  이 프로젝트의 `AGENTS.md`(=`CLAUDE.md`가 참조)에 "Next.js 버전이 학습 데이터와 다를 수
  있으니 `node_modules/next/dist/docs/`를 먼저 확인하라"는 지시가 있다.
- **색상은 토큰 우선**: `app/globals.css`의 `@theme` 토큰(`bg-canvas`, `text-fg`,
  `bg-surface`, `border-line`, `text-accent` 등)을 통해서만 색을 쓴다. 예외는 대시보드
  카테고리 차트 팔레트 하나뿐이며, 그 이유는 2절에 코드 주석 그대로 남겨뒀다.
- **`suppressHydrationWarning`은 `<body>` 한 곳에만** 붙인다(`app/layout.tsx`). 브라우저
  확장이 `<body>`에 주입하는 속성 때문에 생기는 hydration 경고를 숨기는 용도이며, 다른
  엘리먼트에 붙이면 진짜 hydration 버그를 숨길 수 있으니 금지.
- **PIN 필수 정책**(게시판): 글/댓글 작성 시 PIN(숫자 4자리)이 항상 필요하다. 빈 값을
  허용하는 헬퍼(`isValidPinOrEmpty`)와 항상 필수인 헬퍼(`isValidPin`)가 구분돼 있으므로
  새 글/댓글 작성 폼에는 반드시 `isValidPin`을 써야 한다(2026-07-27 정책 변경, 코드 주석 확인).

## 8. 확인 불가 항목

- Figma 등 별도 디자인 소스 파일 존재 여부 — 확인 불가(레포 안에는 없음).
- 향후 라이트 모드 지원 계획 여부 — 코드상 다크 전용이라는 사실만 확인했고, 계획 유무는
  확인 불가.
- Linear 폰트(Inter Variable, weight 510 및 `cv01`/`ss03` OpenType 기능)를 얼마나
  가깝게 재현했는지의 시각적 체감 차이 — 기존 `DESIGN.md`(git 이력상 최초 커밋부터
  존재)의 "정직한 한계" 절에 코드 작성자 본인이 "Next.js Google Fonts 로더가 가변 폰트
  feature-settings를 세부 제어 못 해 single-story a 등은 재현 안 됨"이라 적어둔 것을
  그대로 신뢰했고, 별도로 렌더링 결과를 직접 대조 검증하지는 못했다(문서 작업이라
  스크린샷 비교 등은 범위 밖으로 판단).
- `app/board/[id]/page.tsx`의 댓글 수정/삭제 인터랙션 전체 UI(라인 100 이후)는 이번
  조사에서 100줄까지만 확인했다. 폼/버튼 className은 위 4~5절 패턴(입력창·pill 버튼·에러
  박스)과 동일한 계열일 가능성이 높지만, 세부 className까지 전수 대조하지는 않았다.
- `public/` 내 이미지 에셋(파비콘 외)의 브랜드 가이드 유무 — 확인 불가. 히어로의 GPTers
  로고는 외부 CDN(`tribe-s3-production.imgix.net`) 이미지를 그대로 참조한다.
