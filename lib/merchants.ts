import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import type { Merchant, MerchantRaw, Product, Sale } from './types'

const DEFAULT_ACCENT_COLOR = '#6B5B4B'

// Проверяем, активна ли распродажа на текущую дату
function isSaleActive(until?: string): boolean {
  if (!until) return true
  const endDate = new Date(until)
  endDate.setHours(23, 59, 59, 999)
  return new Date() <= endDate
}

// Вычисляем итоговый процент скидки для товара
function resolveDiscount(
  productDiscount: number | undefined,
  salePercent: number | undefined,
  saleActive: boolean,
): number | undefined {
  if (productDiscount !== undefined) return productDiscount
  if (salePercent !== undefined && saleActive) return salePercent
  return undefined
}

// Парсим один YAML-файл мастера
function parseMerchant(filePath: string): Merchant {
  const raw = yaml.load(fs.readFileSync(filePath, 'utf-8')) as MerchantRaw

  const sale: Sale | undefined = raw.sale
    ? {
        percent: raw.sale.percent,
        until: raw.sale.until,
        text: raw.sale.text,
        isActive: isSaleActive(raw.sale.until),
      }
    : undefined

  const saleActive = sale?.isActive ?? false
  const salePercent = sale?.percent

  const products: Product[] = raw.products.map((p) => {
    const discountPercent = resolveDiscount(p.discount, salePercent, saleActive)
    const discountedPrice =
      discountPercent !== undefined
        ? Math.round(p.price * (1 - discountPercent / 100))
        : undefined

    return {
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.image,
      discountPercent,
      discountedPrice,
      isAvailable: true,
    }
  })

  return {
    slug: raw.slug,
    name: raw.name,
    tagline: raw.tagline,
    avatar: raw.avatar,
    telegram: raw.telegram,
    accentColor: raw.accentColor ?? DEFAULT_ACCENT_COLOR,
    sale,
    products,
  }
}

// Загружаем все YAML-файлы мастеров из директории data/merchants/
export function getAllMerchants(): Merchant[] {
  const dir = path.join(process.cwd(), 'data', 'merchants')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.yaml'))
  return files.map((f) => parseMerchant(path.join(dir, f)))
}

// Загружаем одного мастера по slug
export function getMerchantBySlug(slug: string): Merchant | null {
  const filePath = path.join(process.cwd(), 'data', 'merchants', `${slug}.yaml`)
  if (!fs.existsSync(filePath)) return null
  return parseMerchant(filePath)
}

// Возвращаем список всех slug для generateStaticParams
export function getAllMerchantSlugs(): string[] {
  const dir = path.join(process.cwd(), 'data', 'merchants')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.yaml'))
  return files.map((f) => f.replace('.yaml', ''))
}
