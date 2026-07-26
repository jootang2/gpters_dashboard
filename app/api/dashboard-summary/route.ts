import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { SurveyResponse, DashboardConfig } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Public route (no admin auth) — but it never exposes raw rows. It reads
// survey_responses + dashboard_config with the service_role client
// (RLS blocks the anon key from reading either table directly) and returns
// only pre-aggregated counts for fields the admin has marked is_visible.
// This is the ONLY way the public /dashboard page is allowed to see
// anything derived from survey_responses.
//
// Two independent admin toggles feed into this:
//   - dashboard_config.is_visible  → per-FIELD (column) visibility
//   - survey_responses.include_in_dashboard → per-ROW (participant) inclusion
// Only rows with include_in_dashboard = true are fetched at all, so both
// totalCount and every aggregated count below already exclude opted-out
// participants.

const CATEGORY_FIELDS = ['claude_code_experience', 'coding_experience', 'age_range'] as const
const ARRAY_FIELDS = ['ai_tools'] as const
const TEXT_FIELDS = ['study_goal', 'automation_wish', 'desired_outcome'] as const

type FieldKey = keyof SurveyResponse

function countOccurrences(data: SurveyResponse[], field: FieldKey) {
  const counts: Record<string, number> = {}
  data.forEach((row) => {
    const val = row[field]
    if (Array.isArray(val)) {
      val.forEach((v: string) => {
        counts[v] = (counts[v] ?? 0) + 1
      })
    } else if (val && typeof val === 'string') {
      counts[val] = (counts[val] ?? 0) + 1
    }
  })
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export async function GET() {
  const [respResult, confResult] = await Promise.all([
    supabaseAdmin.from('survey_responses').select('*').eq('include_in_dashboard', true),
    supabaseAdmin.from('dashboard_config').select('*'),
  ])

  if (respResult.error || confResult.error) {
    console.error('[api/dashboard-summary] Supabase error:', respResult.error ?? confResult.error)
    return NextResponse.json(
      { error: (respResult.error ?? confResult.error)?.message ?? 'Supabase error' },
      { status: 500 }
    )
  }

  const responses = (respResult.data ?? []) as SurveyResponse[]
  const configs = (confResult.data ?? []) as DashboardConfig[]

  const isVisible = (key: string) => configs.find((c) => c.field_key === key)?.is_visible ?? false
  const getLabel = (key: string) => configs.find((c) => c.field_key === key)?.display_label ?? key

  const categories = CATEGORY_FIELDS.filter(isVisible).map((field) => ({
    field,
    label: getLabel(field),
    data: countOccurrences(responses, field as FieldKey),
  }))

  const arrays = ARRAY_FIELDS.filter(isVisible).map((field) => ({
    field,
    label: getLabel(field),
    data: countOccurrences(responses, field as FieldKey),
  }))

  const texts = TEXT_FIELDS.filter(isVisible).map((field) => ({
    field,
    label: getLabel(field),
    items: responses.map((r) => r[field as FieldKey] as string).filter(Boolean),
  }))

  return NextResponse.json({
    totalCount: responses.length,
    hasConfig: configs.length > 0,
    categories,
    arrays,
    texts,
  })
}
