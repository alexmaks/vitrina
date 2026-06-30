import { createClient } from '@supabase/supabase-js'

// Браузерный клиент с anon-ключом. Используется только для прямой загрузки
// файлов в Storage по подписанному URL (uploadToSignedUrl) — токен в URL
// сам авторизует загрузку в конкретный путь, обходя лимиты нашего сервера.
export function createSupabaseBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
