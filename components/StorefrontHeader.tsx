import Image from 'next/image'
import type { Merchant } from '@/lib/types'

interface StorefrontHeaderProps {
  merchant: Merchant
}

export default function StorefrontHeader({ merchant }: StorefrontHeaderProps) {
  return (
    <header
      className="flex items-center gap-3 px-4 py-3"
      style={{
        backgroundColor: merchant.accentColor + '1A',
        borderBottom: `3px solid ${merchant.accentColor}`,
      }}
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-black/10">
        <Image
          src={merchant.avatar}
          alt={merchant.name}
          fill
          className="object-cover"
          sizes="40px"
          priority
        />
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold leading-tight text-[#1A1A1A]">
          {merchant.name}
        </p>
        <p className="truncate text-sm leading-tight text-[#6B6B6B]">
          {merchant.tagline}
        </p>
      </div>
    </header>
  )
}
