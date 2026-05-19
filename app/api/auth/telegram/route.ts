import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session'

// Простой in-memory rate-limiter: 10 запросов в минуту на IP
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 10
const RATE_WINDOW = 60_000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const timestamps = (rateLimitMap.get(ip) ?? []).filter(
    (t) => now - t < RATE_WINDOW,
  )
  if (timestamps.length >= RATE_LIMIT) return false
  timestamps.push(now)
  rateLimitMap.set(ip, timestamps)
  return true
}

const encoder = new TextEncoder()

// Telegram hash verification using Web Crypto API
async function verifyTelegramHash(
  data: Record<string, string>,
  hash: string,
): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return false

  // Создаём строку проверки
  const checkString = Object.keys(data)
    .filter((k) => k !== 'hash')
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join('\n')

  // Ключ = SHA-256 от bot token
  const tokenHash = await globalThis.crypto.subtle.digest(
    'SHA-256',
    encoder.encode(botToken),
  )
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    tokenHash,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuffer = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(checkString),
  )
  const expectedHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // Constant-time compare
  if (hash.length !== expectedHex.length) return false
  let diff = 0
  for (let i = 0; i < hash.length; i++) {
    diff |= hash.charCodeAt(i) ^ expectedHex.charCodeAt(i)
  }
  return diff === 0
}

export async function POST(request: Request) {
  // Rate limit по IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { hash, ...rest } = body
  if (!hash) {
    return NextResponse.json({ error: 'Missing hash' }, { status: 400 })
  }

  // Проверяем подпись Telegram
  if (!(await verifyTelegramHash(rest, hash))) {
    return NextResponse.json({ error: 'Invalid hash' }, { status: 401 })
  }

  // Проверяем свежесть данных (не старше 24 часов)
  const authDate = parseInt(rest.auth_date ?? '0', 10)
  if (Date.now() / 1000 - authDate > 86400) {
    return NextResponse.json({ error: 'Auth data expired' }, { status: 401 })
  }

  const telegramId = parseInt(rest.id, 10)
  const username = rest.username ?? null
  const firstName = rest.first_name ?? null

  // UPSERT мастера в Supabase
  const supabase = createSupabaseAdminClient()
  const { data: merchant, error } = await supabase
    .from('merchants')
    .upsert(
      {
        telegram_id: telegramId,
        telegram_username: username,
        telegram_first_name: firstName,
        contact_telegram: username ?? String(telegramId),
      },
      {
        onConflict: 'telegram_id',
        ignoreDuplicates: false,
      },
    )
    .select('id, slug, is_published')
    .single()

  if (error || !merchant) {
    console.error('Supabase upsert error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Определяем куда перенаправить
  const isNew = !merchant.slug || !merchant.is_published
  const redirectUrl = isNew ? '/admin/setup' : '/admin/products'

  // Создаём и устанавливаем сессионную cookie
  const token = await signSession({
    merchantId: merchant.id,
    telegramId,
    slug: merchant.slug ?? null,
  })

  const response = NextResponse.json({ redirectUrl })
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return response
}
