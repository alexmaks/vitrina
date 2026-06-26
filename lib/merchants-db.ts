import { createSupabaseServerClient } from './supabase/server'
import type { Merchant, Product, Sale } from './types'

const DEFAULT_ACCENT_COLOR = '#854F0B'

// ──────────────────────────────────────────────
// DB row types (snake_case из Supabase)
// ──────────────────────────────────────────────
interface ProductRow {
  id: string
  name: string
  price: number
  image_url: string | null
  image_urls: string[] | null
  video_url: string | null
  description: string | null
  discount_percent: number | null
  is_available: boolean
  sort_order: number
}

interface MerchantRow {
  id: string
  slug: string
  name: string
  tagline: string | null
  avatar_url: string | null
  telegram_id: number
  contact_telegram: string
  accent_color: string | null
  sale_percent: number | null
  sale_until: string | null
  sale_text: string | null
  is_published: boolean
  products: ProductRow[]
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function isSaleActive(until: string | null): boolean {
  if (!until) return true
  const end = new Date(until)
  end.setHours(23, 59, 59, 999)
  return new Date() <= end
}

function mapRow(row: MerchantRow): Merchant {
  const saleActive = row.sale_percent
    ? isSaleActive(row.sale_until)
    : false

  const sale: Sale | undefined =
    row.sale_percent
      ? {
          percent: row.sale_percent,
          until: row.sale_until ?? undefined,
          text: row.sale_text ?? 'Распродажа на всё',
          isActive: saleActive,
        }
      : undefined

  const products: Product[] = (row.products ?? [])
    // Баг 4: на публичной витрине — сначала товары в наличии, потом нет.
    // Внутри каждой группы — по sort_order.
    .sort((a, b) => {
      if (a.is_available !== b.is_available) return a.is_available ? -1 : 1
      return a.sort_order - b.sort_order
    })
    .map((p) => {
      const discountPercent =
        p.discount_percent ?? (saleActive && row.sale_percent ? row.sale_percent : undefined)
      const discountedPrice =
        discountPercent !== undefined
          ? Math.round(p.price * (1 - discountPercent / 100))
          : undefined
      // Собираем массив фото: приоритет у image_urls, фолбэк на image_url
      const images: string[] =
        p.image_urls && p.image_urls.length > 0
          ? p.image_urls
          : p.image_url
            ? [p.image_url]
            : []
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        image: images[0] ?? '',
        images,
        video: p.video_url ?? undefined,
        description: p.description ?? undefined,
        discountPercent,
        discountedPrice,
        isAvailable: p.is_available,
      }
    })

  return {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline ?? '',
    avatar: row.avatar_url ?? '',
    telegram: row.contact_telegram,
    accentColor: row.accent_color ?? DEFAULT_ACCENT_COLOR,
    sale,
    products,
  }
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

// Для страницы витрины /[slug] — только опубликованные
// Использует admin client (работает и при ISR и при static build)
export async function getMerchantBySlug(slug: string): Promise<Merchant | null> {
  const { createSupabaseAdminClient } = await import('./supabase/admin')
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('merchants')
    .select(`
      id, slug, name, tagline, avatar_url, contact_telegram,
      accent_color, sale_percent, sale_until, sale_text, is_published,
      products (
        id, name, price, image_url, image_urls, video_url, description,
        discount_percent, is_available, sort_order
      )
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error || !data) return null
  return mapRow(data as MerchantRow)
}

// Для generateStaticParams витрины — использует admin client (нет cookies)
export async function getAllPublishedSlugs(): Promise<string[]> {
  const { createSupabaseAdminClient } = await import('./supabase/admin')
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from('merchants')
    .select('slug')
    .eq('is_published', true)
  return (data ?? []).map((r: { slug: string }) => r.slug)
}

// Для admin-layout — без фильтра is_published (нужен service_role или
// read своей строки через RLS — пока используем server client c anon,
// данные доступны только после авторизации через session)
export async function getMerchantForAdmin(merchantId: string): Promise<Merchant | null> {
  // Используем admin client чтобы обойти RLS is_published
  const { createSupabaseAdminClient } = await import('./supabase/admin')
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('merchants')
    .select(`
      id, slug, name, tagline, avatar_url, contact_telegram,
      accent_color, sale_percent, sale_until, sale_text, is_published,
      products (
        id, name, price, image_url, image_urls, video_url, description,
        discount_percent, is_available, sort_order
      )
    `)
    .eq('id', merchantId)
    .single()

  if (error || !data) return null
  return mapRow(data as MerchantRow)
}

// Для admin — полные данные включая ID (для форм)
export interface MerchantAdmin extends Merchant {
  id: string
  isPublished: boolean
}

export async function getMerchantAdminData(merchantId: string): Promise<MerchantAdmin | null> {
  const { createSupabaseAdminClient } = await import('./supabase/admin')
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('merchants')
    .select(`
      id, slug, name, tagline, avatar_url, contact_telegram,
      accent_color, sale_percent, sale_until, sale_text, is_published,
      products (
        id, name, price, image_url, image_urls, video_url, description,
        discount_percent, is_available, sort_order
      )
    `)
    .eq('id', merchantId)
    .single()

  if (error || !data) return null
  const merchant = mapRow(data as MerchantRow)
  return {
    ...merchant,
    id: (data as MerchantRow).id,
    isPublished: (data as MerchantRow).is_published,
  }
}
