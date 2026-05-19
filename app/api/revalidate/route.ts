import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'

// Rate-limit: 60 запросов в минуту
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 60
const RATE_WINDOW = 60_000

function checkRateLimit(id: string): boolean {
  const now = Date.now()
  const ts = (rateLimitMap.get(id) ?? []).filter((t) => now - t < RATE_WINDOW)
  if (ts.length >= RATE_LIMIT) return false
  ts.push(now)
  rateLimitMap.set(id, ts)
  return true
}

export async function POST(request: Request) {
  // Проверяем сессию
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!checkRateLimit(session.merchantId)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let slug: string
  try {
    const body = await request.json()
    slug = body.slug
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  revalidatePath(`/${slug}`)
  return NextResponse.json({ revalidated: true })
}
