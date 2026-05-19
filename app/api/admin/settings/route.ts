import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, tagline, accentColor, contactTelegram, avatarUrl } = body

  if (!name || !contactTelegram) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('merchants')
    .update({
      name,
      tagline: tagline || null,
      accent_color: accentColor,
      contact_telegram: contactTelegram.replace(/^@/, ''),
      avatar_url: avatarUrl || null,
    } as Record<string, unknown>)
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
