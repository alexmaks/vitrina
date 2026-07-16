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

  const body = await request.json()
  const { name, tagline, accentColor, contactTelegram, avatarUrl, bgImageUrl } = body

  if (!name || !contactTelegram) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()

  // Тариф: свой цвет и фон сохраняем только на Pro (сервер решает)
  const { data: planRow } = await supabase
    .from('merchants')
    .select('plan, plan_until')
    .eq('id', session.merchantId)
    .single()
  const pro = isPlanActive(planRow?.plan, planRow?.plan_until)

  const update: Record<string, unknown> = {
    name,
    tagline: tagline || null,
    contact_telegram: contactTelegram.replace(/^@/, ''),
    avatar_url: avatarUrl || null,
  }
  if (pro) {
    update.accent_color = accentColor
    update.bg_image_url = bgImageUrl || null
  }

  const { error } = await supabase
    .from('merchants')
    .update(update)
    .eq('id', session.merchantId)

  if (error) {
    console.error('Settings update error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if (session.slug) {
    revalidatePath(`/${session.slug}`)
  }

  return NextResponse.json({ ok: true })
}
