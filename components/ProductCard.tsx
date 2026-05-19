import Image from 'next/image'
import type { Product } from '@/lib/types'
import { STRINGS } from '@/lib/strings'

interface ProductCardProps {
  product: Product
  // Первые 2 карточки грузим с priority (above the fold = LCP)
  priority?: boolean
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const unavailable = !product.isAvailable

  return (
    <article className={`overflow-hidden rounded-xl border bg-white transition-opacity ${unavailable ? 'border-[#E5E5E0] opacity-60' : 'border-[#E5E5E0]'}`}>
      {/* Квадратное фото с бейджем скидки / бейджем «нет в наличии» */}
      <div className="relative aspect-square w-full">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-opacity duration-300"
            sizes="(max-width: 480px) 50vw, 240px"
            priority={priority}
            loading={priority ? 'eager' : 'lazy'}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#F5F5F0] text-4xl">
            📦
          </div>
        )}
        {unavailable && (
          <div className="absolute inset-0 flex items-end justify-center bg-black/10 pb-2">
            <span className="rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
              Нет в наличии
            </span>
          </div>
        )}
        {!unavailable && product.discountPercent !== undefined && (
          <span
            className="absolute right-2 top-2 rounded-md bg-[#C8332E] px-1.5 py-0.5 text-xs font-bold leading-none text-white"
            aria-label={`Скидка ${product.discountPercent} процентов`}
          >
            {STRINGS.discount(product.discountPercent)}
          </span>
        )}
      </div>

      {/* Название и цена */}
      <div className="px-2.5 py-2">
        <p className="truncate text-sm leading-snug text-[#1A1A1A]">
          {product.name}
        </p>
        <div className="mt-1 flex items-baseline gap-1.5">
          {!unavailable && product.discountedPrice !== undefined ? (
            <>
              <span className="text-sm font-bold text-[#C8332E]">
                {product.discountedPrice.toLocaleString('ru-RU')} {STRINGS.currency}
              </span>
              <span className="text-xs text-[#9A9A9A] line-through">
                {product.price.toLocaleString('ru-RU')} {STRINGS.currency}
              </span>
            </>
          ) : (
            <span className={`text-sm font-semibold ${unavailable ? 'text-[#9A9A9A]' : 'text-[#1A1A1A]'}`}>
              {product.price.toLocaleString('ru-RU')} {STRINGS.currency}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
