import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
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
  const type = (formData.get('type') as string) ?? 'product' // 'avatar' | 'product'
  const productId = (formData.get('productId') as string) ?? 'new'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
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

  // Конвертируем через Sharp: 1080×1080 WebP quality 80
  let processed: Buffer
  try {
    processed = await sharp(buffer)
      .rotate() // авто-поворот по EXIF — иначе фото с iPhone уезжают набок
      .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
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
      : `products/${merchantId}/${productId}.webp`
  const bucket = type === 'avatar' ? 'avatars' : 'products'

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
