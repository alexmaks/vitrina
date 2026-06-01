'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Product, Merchant } from '@/lib/types'
import { STRINGS } from '@/lib/strings'
import ProductSheet from './ProductSheet'

type Props = {
  products: Product[]
  telegram: Merchant['telegram']
  merchantName: Merchant['name']
}

function ProductCard({
  product,
  priority,
  onClick,
}: {
  product: Product
  priority: boolean
  onClick: () => void
}) {
  const unavailable = !product.isAvailable

  return (
    <article
      onClick={onClick}
      className={`cursor-pointer overflow-hidden rounded-xl border border-[#E5E5E0] bg-white transition-transform active:scale-[0.97] ${unavailable ? 'opacity-60' : ''}`}
    >
      <div className="relative aspect-square w-full">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
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
          <span className="absolute right-2 top-2 rounded-md bg-[#C8332E] px-1.5 py-0.5 text-xs font-bold leading-none text-white">
            {STRINGS.discount(product.discountPercent)}
          </span>
        )}
      </div>

      <div className="px-2.5 py-2">
        <p className="truncate text-sm leading-snug text-[#1A1A1A]">{product.name}</p>
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

export default function ProductGallery({ products, telegram, merchantName }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  return (
    <section className="px-3 pb-4 pt-3">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-[#1A1A1A]">{STRINGS.catalog}</h2>
        <span className="text-sm text-[#9A9A9A]">{STRINGS.productsCount(products.length)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            priority={i < 2}
            onClick={() => setSelectedIndex(i)}
          />
        ))}
      </div>

      {selectedIndex !== null && (
        <ProductSheet
          products={products}
          initialIndex={selectedIndex}
          telegram={telegram}
          merchantName={merchantName}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </section>
  )
}
