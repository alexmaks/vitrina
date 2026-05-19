import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { verifySession, SESSION_COOKIE, signSession, SESSION_MAX_AGE } from '@/lib/session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isSlugValid, RESERVED_SLUGS } from '@/lib/slugify'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { name: string; tagline?: string; slug: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, tagline, slug } = body
  if (!name || !slug) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (!isSlugValid(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }
  if (RESERVED_SLUGS.includes(slug)) {
    return NextResponse.json({ error: 'Slug is reserved' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()

  // Проверяем уникальность slug (кроме текущего мастера)
  const { count } = await supabase
    .from('merchants')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug)
    .neq('id', session.merchantId)

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
  }

  const { error } = await supabase
    .from('merchants')
    .update({
      name,
      tagline: tagline ?? null,
      slug,
      is_published: true,
    } as Record<string, unknown>)
    .eq('id', session.merchantId)

  if (error) {
    console.error('Setup update error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  revalidatePath(`/${slug}`)

  // Обновляем cookie с новым slug
  const newToken = await signSession({
    merchantId: session.merchantId,
    telegramId: session.telegramId,
    slug,
  })
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return response
}
