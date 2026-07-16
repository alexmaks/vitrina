import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isPlanActive } from '@/lib/plan'

// Подписанный URL для ПРЯМОЙ загрузки видео в Storage из браузера.
// Так тяжёлые файлы (4K с телефона) не идут через нашу функцию и не упираются
// в лимит размера запроса/таймаут Vercel — только в лимит бакета (50 МБ).

const MAX_VIDEO = 50 * 1024 * 1024
const EXT_BY_TYPE: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Видео — Pro-фишка
  const supabaseGate = createSupabaseAdminClient()
  const { data: planRow } = await supabaseGate
    .from('merchants')
    .select('plan, plan_until')
    .eq('id', session.merchantId)
    .single()
  if (!isPlanActive(planRow?.plan, planRow?.plan_until)) {
    return NextResponse.json({ error: 'Видео товара доступно в Pro' }, { status: 403 })
  }

  let body: { productId?: string; contentType?: string; size?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const ext = EXT_BY_TYPE[body.contentType ?? '']
  if (!ext) {
    return NextResponse.json({ error: 'Поддерживаются видео MP4, MOV или WebM' }, { status: 415 })
  }
  if (!body.size || body.size > MAX_VIDEO) {
    return NextResponse.json({ error: 'Видео слишком большое (макс. 50 МБ)' }, { status: 413 })
  }

  const safeId = (body.productId || 'new').replace(/[^a-zA-Z0-9_-]/g, '')
  const path = `${session.merchantId}/${safeId}.${ext}`

  const supabase = createSupabaseAdminClient()
  // Удаляем прежний файл по этому пути, чтобы перезалив прошёл без конфликта.
  await supabase.storage.from('videos').remove([path]).catch(() => {})

  const { data, error } = await supabase.storage.from('videos').createSignedUploadUrl(path)
  if (error || !data) {
    console.error('createSignedUploadUrl error:', error)
    return NextResponse.json({ error: 'Не удалось подготовить загрузку' }, { status: 500 })
  }

  const { data: pub } = supabase.storage.from('videos').getPublicUrl(path)
  return NextResponse.json({ token: data.token, path: data.path, publicUrl: pub.publicUrl })
}
