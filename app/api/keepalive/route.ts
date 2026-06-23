import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Keep-alive: не даём free-tier Supabase уснуть.
// Free-tier паузит проект после ~7 дней без запросов к БД → хост уходит в
// NXDOMAIN, ломается вход и витрины. Vercel Cron дёргает этот эндпоинт раз в
// сутки, делая один дешёвый запрос — для базы это «активность», паузы нет.

// Route handler не должен кешироваться, иначе крон попадёт в кеш и БД не
// проснётся. В Next 16 GET и так не кешируется, но фиксируем явно.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Vercel автоматически шлёт `Authorization: Bearer ${CRON_SECRET}`, если
  // переменная CRON_SECRET задана. Если задана — проверяем; если нет —
  // пускаем (эндпоинт безвреден: только лёгкий SELECT count).
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const supabase = createSupabaseAdminClient()
    // Самый дешёвый запрос: только счётчик строк, без выборки данных.
    const { error } = await supabase
      .from('merchants')
      .select('id', { count: 'exact', head: true })

    if (error) {
      console.error('keepalive query error:', error)
      return NextResponse.json({ ok: false, error: 'db' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, ts: new Date().toISOString() })
  } catch (error) {
    console.error('keepalive error:', error)
    return NextResponse.json({ ok: false, error: 'unexpected' }, { status: 500 })
  }
}
