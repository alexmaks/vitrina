'use client'

import { createBrowserClient } from '@supabase/ssr'

// Клиент для Client Components (только публичное чтение).
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
