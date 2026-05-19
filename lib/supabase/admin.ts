// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Клиент с service_role — обходит RLS.
// Использовать ТОЛЬКО в Server Actions / API routes.
// НИКОГДА не импортировать в 'use client' файлы.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminClient: SupabaseClient<any> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSupabaseAdminClient(): SupabaseClient<any> {
  if (!adminClient) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adminClient = createClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )
  }
  return adminClient
}
