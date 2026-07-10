import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getMerchantAdminData } from '@/lib/merchants-db'

export const dynamic = 'force-dynamic'

interface EventRow {
  kind: string
  product_id: string | null
  created_at: string
}

interface Tally {
  today: number
  week: number
  total: number
}

function tally(events: EventRow[], kind: string, todayMs: number, weekMs: number): Tally {
  let today = 0
  let week = 0
  let total = 0
  for (const e of events) {
    if (e.kind !== kind) continue
    total++
    const t = new Date(e.created_at).getTime()
    if (t >= weekMs) week++
    if (t >= todayMs) today++
  }
  return { today, week, total }
}

function MetricCard({ title, data }: { title: string; data: Tally }) {
  return (
    <div className="rounded-2xl border border-[#E5E5E0] bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-[#1A1A1A]">{title}</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Сегодня', value: data.today },
          { label: '7 дней', value: data.week },
          { label: 'Всего', value: data.total },
        ].map((c) => (
          <div key={c.label}>
            <p className="text-2xl font-bold text-[#854F0B]">{c.value.toLocaleString('ru-RU')}</p>
            <p className="mt-0.5 text-xs text-[#9A9A9A]">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function StatsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) redirect('/login')

  const merchant = await getMerchantAdminData(session.merchantId)
  if (!merchant) redirect('/login')

  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from('page_events')
    .select('kind, product_id, created_at')
    .eq('merchant_id', session.merchantId)
    .order('created_at', { ascending: false })
    .limit(20000)

  const events = (data ?? []) as EventRow[]

  const startToday = new Date()
  startToday.setHours(0, 0, 0, 0)
  const todayMs = startToday.getTime()
  const weekMs = Date.now() - 7 * 24 * 3600 * 1000

  const visits = tally(events, 'visit', todayMs, weekMs)
  const productViews = tally(events, 'product', todayMs, weekMs)
  const contacts = tally(events, 'contact', todayMs, weekMs)

  // Топ товаров по просмотрам за всё время
  const counts = new Map<string, number>()
  for (const e of events) {
    if (e.kind === 'product' && e.product_id) {
      counts.set(e.product_id, (counts.get(e.product_id) ?? 0) + 1)
    }
  }
  const nameById = new Map(merchant.products.map((p) => [p.id, p.name]))
  const topProducts = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ name: nameById.get(id) ?? 'Удалённый товар', count }))

  const hasData = events.length > 0

  return (
    <div className="px-5 py-6">
      <h1 className="mb-1 text-xl font-bold text-[#1A1A1A]">Статистика</h1>
      <p className="mb-6 text-sm text-[#9A9A9A]">Сколько людей смотрят вашу витрину</p>

      {!hasData ? (
        <div className="mt-12 text-center">
          <div className="mb-4 text-5xl">📊</div>
          <p className="mb-2 font-semibold text-[#1A1A1A]">Данных пока нет</p>
          <p className="text-sm text-[#9A9A9A]">
            Как только витрину начнут открывать, здесь появятся посещения и просмотры.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <MetricCard title="Посещения витрины" data={visits} />
          <MetricCard title="Просмотры товаров" data={productViews} />
          <MetricCard title="Клики «Написать»" data={contacts} />

          {topProducts.length > 0 && (
            <div className="rounded-2xl border border-[#E5E5E0] bg-white p-4">
              <p className="mb-3 text-sm font-semibold text-[#1A1A1A]">
                Топ товаров по просмотрам
              </p>
              <ol className="flex flex-col gap-2">
                {topProducts.map((p, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F0EFE9] text-xs font-bold text-[#854F0B]">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-[#1A1A1A]">
                      {p.name}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-[#854F0B]">
                      {p.count.toLocaleString('ru-RU')}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="px-1 text-xs text-[#9A9A9A]">
            Считаются уникальные посетители за сессию, боты и превью-ссылки не учитываются.
          </p>
        </div>
      )}
    </div>
  )
}
