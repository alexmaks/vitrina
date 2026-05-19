import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Только для суперадмина — проверяем telegramId из сессии
const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID ?? '0')

export default async function SuperAdminPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null

  // Не залогинен → на логин
  if (!session) redirect('/login')

  // Не суперадмин → на свою админку
  if (!ADMIN_TELEGRAM_ID || session.telegramId !== ADMIN_TELEGRAM_ID) {
    redirect('/admin/products')
  }

  const supabase = createSupabaseAdminClient()
  const { data: merchants } = await supabase
    .from('merchants')
    .select('id, slug, name, tagline, is_published, telegram_username, created_at')
    .order('created_at', { ascending: false })

  const total = merchants?.length ?? 0
  const published = merchants?.filter((m) => m.is_published).length ?? 0

  return (
    <div className="page-container min-h-svh bg-[#F5F5F0] px-5 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/products" className="text-[#854F0B] text-sm">
          ← Моя админка
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-bold text-[#1A1A1A]">Все мастера</h1>
      <p className="mb-6 text-sm text-[#9A9A9A]">
        {published} опубликованных · {total} всего
      </p>

      <div className="flex flex-col gap-2">
        {(merchants ?? []).map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-2xl border border-[#E5E5E0] bg-white px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[#1A1A1A] truncate">{m.name}</p>
                {!m.is_published && (
                  <span className="shrink-0 rounded-full bg-[#F5F5F0] px-2 py-0.5 text-xs text-[#9A9A9A]">
                    черновик
                  </span>
                )}
              </div>
              <p className="text-sm text-[#9A9A9A] truncate">
                {m.tagline ?? '—'} · @{m.telegram_username ?? '?'}
              </p>
            </div>
            <div className="ml-3 flex items-center gap-2 shrink-0">
              {m.is_published && m.slug && (
                <a
                  href={`/${m.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-[#F5F5F0] px-3 py-1.5 text-xs font-medium text-[#854F0B] hover:bg-[#EDE8E3]"
                >
                  Витрина ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {total === 0 && (
        <p className="mt-16 text-center text-[#9A9A9A]">Мастеров пока нет</p>
      )}
    </div>
  )
}
