import type { Sale } from '@/lib/types'
import { STRINGS } from '@/lib/strings'

interface SaleBannerProps {
  sale: Sale
}

export default function SaleBanner({ sale }: SaleBannerProps) {
  if (!sale.isActive) return null

  return (
    <div className="flex items-center gap-2 bg-[#C8332E1A] px-4 py-2">
      <span className="text-base leading-none" aria-hidden="true">
        🔥
      </span>
      <span className="text-sm font-medium text-[#C8332E]">
        {sale.text}
        {sale.until && (
          <span className="ml-1 font-normal opacity-80">
            {STRINGS.saleUntil(sale.until)}
          </span>
        )}
      </span>
    </div>
  )
}
