import type { Product } from '@/lib/types'
import { STRINGS } from '@/lib/strings'
import ProductCard from './ProductCard'

interface ProductGridProps {
  products: Product[]
}

export default function ProductGrid({ products }: ProductGridProps) {
  return (
    <section className="px-3 pb-4 pt-3">
      {/* Заголовок с счётчиком */}
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-[#1A1A1A]">
          {STRINGS.catalog}
        </h2>
        <span className="text-sm text-[#9A9A9A]">
          {STRINGS.productsCount(products.length)}
        </span>
      </div>

      {/* Сетка 2 колонки. Первые 2 карточки — priority (LCP above the fold) */}
      <div className="grid grid-cols-2 gap-2.5">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            priority={index < 2}
          />
        ))}
      </div>
    </section>
  )
}
