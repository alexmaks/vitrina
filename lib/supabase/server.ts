import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Клиент для Server Components и Route Handlers.
// Использует anon key + RLS — только публичное чтение.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // В Server Components set игнорируется
          }
        },
      },
    },
  )
}
