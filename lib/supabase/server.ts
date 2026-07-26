import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server-side Supabase client for Route Handlers / Server Components.
// Uses the ANON key (not service_role) — auth is enforced via the real
// Supabase Auth session stored in cookies, not by an elevated key. RLS
// still applies to whatever this client does; admin data routes separately
// use lib/supabase-admin.ts (service_role) ONLY after confirming a valid
// session via requireAdminUser() in lib/admin-auth.ts.
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component render (not a Route Handler /
            // Server Action) — cookies can't be written there. Safe to
            // ignore because middleware.ts refreshes the session on every
            // request.
          }
        },
      },
    }
  )
}
