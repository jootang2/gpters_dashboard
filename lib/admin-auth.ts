import { createServerSupabaseClient } from './supabase/server'

// Real Supabase Auth check (replaces the old NEXT_PUBLIC_ADMIN_PASSWORD
// header-comparison model). Public sign-up is disabled for this project
// (Supabase Auth "disable_signup" = true, set via Management API) and the
// only account is the one admin created via the Admin API — so "has a
// valid session" is equivalent to "is admin" here. No role table needed.
//
// Returns the authenticated user, or null if there is no valid session.
export async function requireAdminUser() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null
  return user
}
