import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Admin-only: toggles a dashboard_config field's visibility.
// Anon key has no write policy on dashboard_config anymore (RLS), so this
// upsert must go through the service_role client, gated by the same real
// Supabase Auth session check used for app/api/admin/data.
export async function PATCH(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const fieldKey = body?.field_key
  const isVisible = body?.is_visible

  if (typeof fieldKey !== 'string' || typeof isVisible !== 'boolean') {
    return NextResponse.json(
      { error: 'Invalid body — expected { field_key: string, is_visible: boolean }' },
      { status: 400 }
    )
  }

  const { error } = await supabaseAdmin
    .from('dashboard_config')
    .upsert({ field_key: fieldKey, is_visible: isVisible }, { onConflict: 'field_key' })

  if (error) {
    console.error('[api/admin/dashboard-config] Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
