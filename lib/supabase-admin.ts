import { createClient } from '@supabase/supabase-js'

// ⚠️ SERVER-ONLY CLIENT — uses the service_role key, which bypasses Row Level
// Security entirely. This file must never be imported from a Client
// Component ('use client') or any code path that ships to the browser.
// Only import this from app/api/**/route.ts (Route Handlers run server-side).
//
// SUPABASE_SERVICE_ROLE_KEY intentionally has NO `NEXT_PUBLIC_` prefix so
// Next.js never inlines it into client bundles.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(
    'Supabase service role environment variables are not set. Admin/aggregation API routes will not work.'
  )
}

export const supabaseAdmin = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  serviceRoleKey ?? 'placeholder-service-role-key',
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
)
