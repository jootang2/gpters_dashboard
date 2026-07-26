import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client used ONLY by app/admin/page.tsx for the real
// Supabase Auth login (signInWithPassword / signOut). Session is stored in
// cookies (not localStorage) so the server (Route Handlers, middleware) can
// read the same session — this is what makes the admin API auth gate work.
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'
  )
}
