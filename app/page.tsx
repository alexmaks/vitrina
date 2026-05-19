import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { STRINGS } from '@/lib/strings'

export const metadata: Metadata = {
  title: STRINGS.homeTitle,
  description: STRINGS.homeSubtitle,
  robots: { index: true, follow: true },
}

// Обновляем раз в час
export const revalidate = 3600

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

async function getPublishedMerchants() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('merchants')
    .select('slug, name, tagline')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(20)
  return data ?? []
}

export default async function HomePage() {
  const merchants = await getPublishedMerchants()

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

        {/* Витрины */}
        {merchants.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#9A9A9A]">
              {STRINGS.homeDemosTitle}
            </h2>
            <div className="flex flex-col gap-2.5">
              {merchants.map((merchant) => (
                <Link
                  key={merchant.slug}
                  href={`/${merchant.slug}`}
                  className="flex min-h-[56px] items-center justify-between rounded-2xl border border-[#E5E5E0] bg-white px-4 py-3 transition-colors hover:border-[#C8C8C0] active:bg-[#F0F0EC]"
                >
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">{merchant.name}</p>
                    <p className="text-sm text-[#9A9A9A]">{merchant.tagline}</p>
                  </div>
                  <span className="text-[#9A9A9A]">
                    <ArrowRightIcon />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

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
