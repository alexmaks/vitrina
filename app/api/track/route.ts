import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isSlugValid } from '@/lib/slugify'

// Приёмник событий статистики. Публичный, но пишет только через service_role.
// Всегда отвечает 204 — чтобы клиент не тратил время на разбор ответа.
export const dynamic = 'force-dynamic'

const KINDS = new Set(['visit', 'product', 'contact'])
const BOT = /bot|crawler|spider|slurp|facebookexternalhit|telegrambot|whatsapp|skype|preview|monitor|headless/i
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const noContent = () => new NextResponse(null, { status: 204 })

export async function POST(request: Request) {
  // Отсекаем ботов и превью-краулеры (Telegram/WhatsApp тянут ссылку)
  const ua = request.headers.get('user-agent') ?? ''
  if (BOT.test(ua)) return noContent()

  let body: { slug?: string; kind?: string; productId?: string }
  try {
    body = await request.json()
  } catch {
    return noContent()
  }

  const { slug, kind, productId } = body
  if (!slug || !isSlugValid(slug) || !kind || !KINDS.has(kind)) return noContent()

  const supabase = createSupabaseAdminClient()
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  if (!merchant) return noContent()

  const validProduct = kind === 'product' && productId && UUID.test(productId) ? productId : null

  await supabase.from('page_events').insert({
    merchant_id: merchant.id,
    kind,
    product_id: validProduct,
  })

  return noContent()
}
