import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isPlanActive } from '@/lib/plan'
import sharp from 'sharp'

// Magic bytes для проверки типа файла
const MAGIC: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  'image/heic': [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]],
}

function detectMimeType(buffer: Buffer): string | null {
  for (const [mime, signatures] of Object.entries(MAGIC)) {
    for (const sig of signatures) {
      if (sig.every((byte, i) => buffer[i] === byte)) return mime
    }
  }
  return null
}

// Видео: MP4/MOV (бокс ftyp) и WebM (EBML). MOV пишут айфоны.
function detectVideo(buffer: Buffer): { contentType: string; ext: string } | null {
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return { contentType: 'video/webm', ext: 'webm' }
  }
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    const brand = buffer.toString('ascii', 8, 12)
    if (brand.startsWith('qt')) return { contentType: 'video/quicktime', ext: 'mov' }
    return { contentType: 'video/mp4', ext: 'mp4' }
  }
  return null
}

export async function POST(request: Request) {
  // Авторизация
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const type = (formData.get('type') as string) ?? 'product' // 'avatar' | 'product' | 'video' | 'background'
  const productId = (formData.get('productId') as string) ?? 'new'

  // Фон витрины — Pro-фишка, проверяем тариф на сервере
  if (type === 'background') {
    const sb = createSupabaseAdminClient()
    const { data: planRow } = await sb
      .from('merchants')
      .select('plan, plan_until')
      .eq('id', session.merchantId)
      .single()
    if (!isPlanActive(planRow?.plan, planRow?.plan_until)) {
      return NextResponse.json({ error: 'Фон витрины доступен в Pro' }, { status: 403 })
    }
  }

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // ── Видео: грузим как есть, без обработки Sharp ─────────────────────
  if (type === 'video') {
    const MAX_VIDEO = 15 * 1024 * 1024
    if (file.size > MAX_VIDEO) {
      return NextResponse.json(
        { error: 'Видео слишком большое (макс. 15 МБ, ~15 секунд)' },
        { status: 413 },
      )
    }
    const vbuf = Buffer.from(await file.arrayBuffer())
    const video = detectVideo(vbuf)
    if (!video) {
      return NextResponse.json(
        { error: 'Поддерживаются видео MP4, MOV или WebM' },
        { status: 415 },
      )
    }
    const supabase = createSupabaseAdminClient()
    const storagePath = `${session.merchantId}/${productId}.${video.ext}`
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(storagePath, vbuf, { contentType: video.contentType, upsert: true })
    if (uploadError) {
      console.error('Video upload error:', uploadError)
      return NextResponse.json({ error: 'Не удалось загрузить видео' }, { status: 500 })
    }
    const { data: urlData } = supabase.storage.from('videos').getPublicUrl(storagePath)
    return NextResponse.json({ url: urlData.publicUrl })
  }

  // Ограничение размера. Вход всё равно пережимается Sharp в WebP ≤1080²,
  // поэтому лимит щедрый — фото с iPhone (HEIC/JPEG) легко весит 3–5 МБ,
  // а старый лимит аватара в 2 МБ молча их отбраковывал.
  const maxSize = 8 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: 'Файл слишком большой (макс. 8 МБ)' },
      { status: 413 },
    )
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Проверка magic bytes
  const detectedMime = detectMimeType(buffer)
  if (!detectedMime) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 })
  }

  // Конвертируем через Sharp в WebP: фон крупнее (1600), остальное 1080²
  const maxDim = type === 'background' ? 1600 : 1080
  let processed: Buffer
  try {
    processed = await sharp(buffer)
      .rotate() // авто-поворот по EXIF — иначе фото с iPhone уезжают набок
      .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
  } catch {
    return NextResponse.json({ error: 'Image processing failed' }, { status: 422 })
  }

  // Определяем путь в Storage
  const merchantId = session.merchantId
  const storagePath =
    type === 'avatar'
      ? `avatars/${merchantId}.webp`
      : type === 'background'
        ? `backgrounds/${merchantId}.webp`
        : `products/${merchantId}/${productId}.webp`
  const bucket = type === 'avatar' || type === 'background' ? 'avatars' : 'products'

  const supabase = createSupabaseAdminClient()
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, processed, {
      contentType: 'image/webp',
      upsert: true,
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath)

  return NextResponse.json({ url: urlData.publicUrl })
}
