import { createClient } from '@supabase/supabase-js'

// Admin client — bypasses RLS entirely (server-side only, never expose to client)

// Admin client — bypasses RLS entirely (server-side only, never expose to client)
export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
