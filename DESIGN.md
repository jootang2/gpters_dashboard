---
omd: "0.1"
brand: "Claude Code 스터디 (GPTers)"
bootstrapped_from: linear.app
bootstrapped_at: "2026-07-17"
mode: inspired
note: >
  omd-master 자동 파이프라인 미가동 상태에서 omd-init 방법론을 수작업 적용.
  linear.app DESIGN.md canonical 토큰을 기반으로 하되, 다크 배경은 기존 프로젝트가
  이미 bg-gray-950을 쓰고 있어 큰 축은 유지하고 인디고 브랜드 컬러 + Inter 타이포 +
  pill 버튼 + 얇은 반투명 보더 시스템으로 전환. 실제 구현은 Tailwind v4 `@theme`
  블록(app/globals.css)에 CSS 커스텀 프로퍼티로 정의 — 전 페이지가 이 한 곳만 참조.
---

# DESIGN.md — Claude Code 스터디 (linear.app 기반)

## 1. Visual Theme & Atmosphere

Linear의 dark-mode-native, 정밀 엔지니어링 인상을 차용. Near-black 캔버스 위에 인디고
브랜드 컬러 하나만 절제해서 쓰고, 나머지는 반투명 흰색 보더/표면 레이어로 위계를 만든다.
"입문자를 위한 스터디"라는 성격에 맞게 Linear보다 살짝 더 밝은 텍스트 대비와 넉넉한 radius를
유지해 차갑지 않게 조정했다(순수 Linear는 6-8px 위주 radius, 여기서는 기존 프로젝트의
12-16px 카드 radius를 존중).

## 2. Color Tokens (Tailwind v4 `@theme` — app/globals.css)

| Token | Hex/Value | 용도 |
|---|---|---|
| `--color-canvas` | `#08090a` | 페이지 배경 (근흑) |
| `--color-panel` | `#0f1011` | 서브 패널/빈 상태 배경 |
| `--color-surface` | `rgba(255,255,255,.05)` | 카드 배경 (반투명 화이트) |
| `--color-surface-strong` | `rgba(255,255,255,.08)` | hover/active 카드 배경 |
| `--color-fg` | `#f7f8f8` | 기본 텍스트 (순백 아님) |
| `--color-text-secondary` | `#d0d6e0` | 본문/설명 텍스트 |
| `--color-muted` | `#8a8f98` | placeholder, 캡션 |
| `--color-muted-2` | `#62666d` | 타임스탬프, 최저 위계 텍스트 |
| `--color-brand` | `#5e6ad2` | 브랜드 인디고 — 프라이머리 CTA, 활성 상태 |
| `--color-accent` | `#7170ff` | 밝은 인디고 — 링크, hover accent |
| `--color-accent-hover` | `#828fff` | hover 시 가장 밝은 인디고 |
| `--color-line` | `rgba(255,255,255,.08)` | 기본 보더 |
| `--color-line-subtle` | `rgba(255,255,255,.05)` | 더 옅은 보더 |
| `--color-error` | `#ff4b4b` | 에러/검증 실패 (기존 red-400 유지) |

## 3. Typography

- Primary: `Inter` (Google Fonts, next/font) — Linear의 시그니처 웨이트 510에 가장 가까운 500 사용
  (Next.js Google Fonts는 임의 weight 미지원이라 400/500/600/700만 로드)
- 헤딩: `font-semibold` + `tracking-tight` (Linear의 음수 letter-spacing 재현)
- 본문: `font-normal`, 15-17px, line-height 1.6

## 4. Component Stylings

- **버튼(primary)**: pill 형태(`rounded-full`), `bg-brand hover:bg-accent-hover`, 텍스트 흰색
- **버튼(secondary/ghost)**: `bg-surface hover:bg-surface-strong`, `border border-line`, pill
- **카드**: `bg-surface border border-line rounded-2xl` (기존 유리모피즘 구조 유지, 색만 토큰화)
- **입력 필드**: `bg-surface border border-line focus:border-accent`
- **네비게이션/링크 강조색**: `text-accent` (기존 blue-400 대체)

## 5. 적용 범위

- `/` (app/page.tsx)
- `/survey` (app/survey/page.tsx)
- `/survey/complete` (app/survey/complete/page.tsx)
- `/dashboard` (app/dashboard/page.tsx)
- `/admin` (app/admin/page.tsx)
- 공용 폰트/토큰: `app/layout.tsx`, `app/globals.css`

## 6. 정직한 한계 (honest gaps)

- Linear 공식 폰트는 Inter Variable(OpenType `cv01`,`ss03` 기능 포함) — Next.js Google Fonts 로더는
  가변 폰트 feature-settings 세부 제어가 제한적이라 해당 알파벳 대체(single-story a 등)는 재현하지 않음.
- Linear의 Cmd+K 커맨드 팔레트, 멀티레이어 그림자 스택 등 프로덕트 전용 컴포넌트는 이 랜딩/설문
  스코프에 해당 사항 없어 미적용.
- recharts 차트 색상(대시보드 파이/바 차트)은 데이터 시각화 가독성을 위해 기존 다색 팔레트를
  유지하고 브랜드 인디고를 첫 번째 색으로만 승격 — 전부 인디고 단색으로 바꾸면 카테고리 구분이
  어려워지므로 의도적으로 유지.
