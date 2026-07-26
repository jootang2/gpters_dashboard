import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Admin-only: returns raw survey_responses + dashboard_config.
// RLS blocks the anon key from SELECT on survey_responses, so this route
// uses the service_role client (server-only, bypasses RLS) — but only after
// verifying the caller has a real Supabase Auth session (see lib/admin-auth.ts).
export async function GET() {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [respResult, confResult] = await Promise.all([
    supabaseAdmin.from('survey_responses').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('dashboard_config').select('*').order('field_key'),
  ])

  if (respResult.error || confResult.error) {
    console.error('[api/admin/data] Supabase error:', respResult.error ?? confResult.error)
    return NextResponse.json(
      { error: (respResult.error ?? confResult.error)?.message ?? 'Supabase error' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    responses: respResult.data ?? [],
    configs: confResult.data ?? [],
  })
}
