#!/usr/bin/env node
/**
 * Seeds (or clears) obviously-fake test rows in survey_responses.
 *
 * Every row this script creates is prefixed "[TEST]" in the name AND uses a
 * "테스트참가자NN" placeholder instead of anything resembling a real
 * person's name — never delete/edit this prefix convention, it's the only
 * thing separating test data from real participant submissions in the same
 * table.
 *
 * Usage (run from project root, needs .env.local with
 * NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY):
 *   node scripts/seed-test-data.cjs            # inserts 30 test rows
 *   node scripts/seed-test-data.cjs --count 10 # inserts N test rows
 *   node scripts/seed-test-data.cjs --clear    # deletes ALL "[TEST]" rows
 *
 * Uses the service_role key (bypasses RLS) since this is an admin-side
 * seeding tool, not something end users trigger.
 */
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const TEST_PREFIX = '[TEST]'

function getEnvVar(name) {
  const envPath = path.join(__dirname, '..', '.env.local')
  const content = fs.readFileSync(envPath, 'utf8')
  const line = content.split('\n').find((l) => l.startsWith(name + '='))
  if (!line) return null
  return line.slice(name.length + 1).replace(/^"|"$/g, '').trim()
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickSubset(arr, min, max) {
  const n = Math.floor(Math.random() * (max - min + 1)) + min
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

const JOB_ROLES = [
  '마케터', '기획자', '강사', '디자이너', 'PM', '프리랜서', '학생',
  '대표', '컨설턴트', 'HR 담당자', '영업', '개발자', '작가', '유튜버',
]
const AGE_RANGES = ['10대', '20대', '30대', '40대', '50대 이상', null]
const LOCATIONS = ['서울', '부산', '대구', '인천', '광주', '대전', '경기', '제주', null]
const CLAUDE_CODE_EXPERIENCE = ['처음 들어봄', '들어봤지만 안 써봄', '써봤음']
const AI_TOOLS = ['ChatGPT', 'Claude', 'Gemini', 'Copilot', '없음', '기타']
const CODING_EXPERIENCE = ['없음', '조금', '있음']
const STUDY_GOALS = [
  '반복 업무 자동화하는 법을 배우고 싶어요',
  '나만의 AI 업무 도구를 만들어보고 싶어요',
  'Claude Code 실전 활용법이 궁금해요',
  '비개발자도 자동화가 가능한지 확인해보고 싶어요',
]
const AUTOMATION_WISHES = [
  '매주 보고서 작성', '고객 문의 이메일 분류', '데이터 정리 및 취합',
  'SNS 콘텐츠 초안 작성', '일정 조율 및 알림',
]
const DESIRED_OUTCOMES = [
  '나만의 AI 업무 도우미', '자동 보고서 생성 봇', '반복 작업 자동화 스크립트',
  '개인 자동화 AI팀 구성',
]

function buildTestRow(i) {
  return {
    name: `${TEST_PREFIX} 테스트참가자${String(i).padStart(2, '0')}`,
    job_role: `${TEST_PREFIX} ${pick(JOB_ROLES)}`,
    age_range: pick(AGE_RANGES),
    location: pick(LOCATIONS),
    claude_code_experience: pick(CLAUDE_CODE_EXPERIENCE),
    ai_tools: pickSubset(AI_TOOLS, 1, 3),
    coding_experience: pick(CODING_EXPERIENCE),
    study_goal: `${TEST_PREFIX} ${pick(STUDY_GOALS)}`,
    automation_wish: `${TEST_PREFIX} ${pick(AUTOMATION_WISHES)}`,
    desired_outcome: `${TEST_PREFIX} ${pick(DESIRED_OUTCOMES)}`,
    // set below per-row
    include_in_dashboard: true,
  }
}

async function main() {
  const url = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const args = process.argv.slice(2)
  const clear = args.includes('--clear')
  const countFlagIdx = args.indexOf('--count')
  const count = countFlagIdx !== -1 ? parseInt(args[countFlagIdx + 1], 10) : 30
  const excludeCount = 5 // how many of the seeded rows get include_in_dashboard = false

  if (clear) {
    const { error, count: deleted } = await admin
      .from('survey_responses')
      .delete({ count: 'exact' })
      .like('name', `${TEST_PREFIX}%`)
    if (error) {
      console.error('DELETE ERROR:', error.message)
      process.exit(1)
    }
    console.log(`Cleared ${deleted ?? '?'} test row(s) (name LIKE '${TEST_PREFIX}%').`)
    return
  }

  const rows = Array.from({ length: count }, (_, idx) => buildTestRow(idx + 1))

  // Randomly mark `excludeCount` rows as include_in_dashboard = false.
  const excludeIndexes = new Set()
  while (excludeIndexes.size < Math.min(excludeCount, rows.length)) {
    excludeIndexes.add(Math.floor(Math.random() * rows.length))
  }
  excludeIndexes.forEach((idx) => {
    rows[idx].include_in_dashboard = false
  })

  const { data, error } = await admin.from('survey_responses').insert(rows).select('id, name, include_in_dashboard')
  if (error) {
    console.error('INSERT ERROR:', error.message)
    process.exit(1)
  }

  console.log(`Inserted ${data.length} test row(s).`)
  const excluded = data.filter((r) => r.include_in_dashboard === false)
  console.log(`  include_in_dashboard = false: ${excluded.length} row(s) ->`, excluded.map((r) => r.name).join(', '))
}

main()
