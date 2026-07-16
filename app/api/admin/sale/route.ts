import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isPlanActive } from '@/lib/plan'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Распродажа — Pro-фишка
  const gate = createSupabaseAdminClient()
  const { data: planRow } = await gate
    .from('merchants')
    .select('plan, plan_until')
    .eq('id', session.merchantId)
    .single()
  if (!isPlanActive(planRow?.plan, planRow?.plan_until)) {
    return NextResponse.json({ error: 'Распродажа доступна в Pro' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { saleActive, salePercent, saleUntil, saleText } = body as Record<string, string>

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('merchants')
    .update({
      sale_percent: saleActive && salePercent ? parseInt(salePercent) : null,
      sale_until: saleActive && saleUntil ? new Date(saleUntil).toISOString() : null,
      sale_text: saleText || 'Распродажа на всё',
    } as Record<string, unknown>)
    .eq('id', session.merchantId)

  if (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if (session.slug) {
    revalidatePath(`/${session.slug}`)
  }

  return NextResponse.json({ ok: true })
}
