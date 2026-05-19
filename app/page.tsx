import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { STRINGS } from '@/lib/strings'

export const metadata: Metadata = {
  title: STRINGS.homeTitle,
  description: STRINGS.homeSubtitle,
  robots: { index: true, follow: true },
}

export const revalidate = 3600

export default async function HomePage() {
  // Если уже залогинен — сразу в админку
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (session) redirect('/admin/products')

  return (
    <div className="page-container flex min-h-svh flex-col">
      <main className="flex flex-1 flex-col px-5 py-10">
        {/* Заголовок */}
        <section className="mb-10">
          <div className="mb-3 inline-flex items-center rounded-full border border-[#E5E5E0] bg-white px-3 py-1 text-xs text-[#6B6B6B]">
            Этап 1 · PWA-Админка
          </div>
          <h1 className="mb-3 text-3xl font-bold leading-tight text-[#1A1A1A]">
            {STRINGS.homeTitle}
          </h1>
          <p className="mb-2 text-lg font-medium text-[#1A1A1A]">
            {STRINGS.homeSubtitle}
          </p>
          <p className="mb-6 text-[15px] leading-relaxed text-[#6B6B6B]">
            {STRINGS.homeDescription}
          </p>
          <Link
            href="/login"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-[#854F0B] px-6 font-semibold text-white transition-opacity hover:opacity-90 active:opacity-75"
          >
            Создать витрину
          </Link>
        </section>

        {/* Контакт автора */}
        <section className="mt-auto">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#9A9A9A]">
            {STRINGS.homeContactTitle}
          </h2>
          <p className="mb-4 text-sm text-[#6B6B6B]">{STRINGS.homeContactText}</p>
          <a
            href="https://t.me/Alex_gypsies"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-[#2AABEE] px-5 font-semibold text-white transition-opacity hover:opacity-90 active:opacity-75"
          >
            {STRINGS.homeContactButton}
          </a>
        </section>
      </main>

      <footer className="border-t border-[#E5E5E0] px-5 py-4 text-center text-xs text-[#9A9A9A]">
        <a href="/privacy" className="underline underline-offset-2 hover:text-[#6B6B6B]">
          Политика конфиденциальности
        </a>
      </footer>
    </div>
  )
}
