import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Admin-only: toggles a single participant's include_in_dashboard flag
// (row-level — separate from dashboard_config.is_visible, which is
// per-field). Excluding a row here does NOT delete it; it just removes it
// from /api/dashboard-summary's aggregation. Admin still sees it in
// app/api/admin/data.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const body = await request.json().catch(() => null)
  const includeInDashboard = body?.include_in_dashboard

  if (typeof includeInDashboard !== 'boolean') {
    return NextResponse.json(
      { error: 'Invalid body — expected { include_in_dashboard: boolean }' },
      { status: 400 }
    )
  }

  const { error } = await supabaseAdmin
    .from('survey_responses')
    .update({ include_in_dashboard: includeInDashboard })
    .eq('id', id)

  if (error) {
    console.error('[api/admin/responses/[id]] Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
