// Типы данных мастера и товаров

export interface ProductRaw {
  id: string
  name: string
  price: number
  image: string
  discount?: number
}

export interface SaleRaw {
  percent: number
  until?: string
  text: string
}

export interface MerchantRaw {
  slug: string
  name: string
  tagline: string
  avatar: string
  telegram: string
  accentColor?: string
  sale?: SaleRaw
  products: ProductRaw[]
}

// Обогащённый товар с рассчитанной скидкой
export interface Product {
  id: string
  name: string
  price: number
  image: string
  description?: string         // описание (опционально)
  discountPercent?: number     // итоговый процент скидки (свой или из sale)
  discountedPrice?: number     // цена со скидкой
  isAvailable: boolean         // наличие товара
}

export interface Sale {
  percent: number
  until?: string
  text: string
  isActive: boolean
}

export interface Merchant {
  slug: string
  name: string
  tagline: string
  avatar: string
  telegram: string
  accentColor: string
  sale?: Sale
  products: Product[]
}
