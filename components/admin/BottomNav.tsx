'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    href: '/admin/products',
    label: 'Товары',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect
          x="3" y="3" width="8" height="8" rx="2"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.5"
        />
        <rect
          x="13" y="3" width="8" height="8" rx="2"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.5"
        />
        <rect
          x="3" y="13" width="8" height="8" rx="2"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.5"
        />
        <rect
          x="13" y="13" width="8" height="8" rx="2"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    href: '/admin/stats',
    label: 'Статистика',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="12" width="4" height="8" rx="1" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
        <rect x="10" y="7" width="4" height="13" rx="1" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
        <rect x="16" y="4" width="4" height="16" rx="1" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: '/admin/sale',
    label: 'Акция',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M9 9h.01M15 15h.01M16 8l-8 8"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
        />
        <circle
          cx="12" cy="12" r="9"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.5"
          fillOpacity={active ? 0.15 : 0}
        />
      </svg>
    ),
  },
  {
    href: '/admin/share',
    label: 'Поделиться',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="18" cy="5" r="3" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
        <circle cx="6" cy="12" r="3" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
        <circle cx="18" cy="19" r="3" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
        <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: '/admin/settings',
    label: 'Настройки',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
          stroke="currentColor" strokeWidth="1.5"
        />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E5E5E0] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 pb-safe px-1 py-2 text-[10px] font-medium transition-colors ${
                active ? 'text-[#854F0B]' : 'text-[#9A9A9A]'
              }`}
            >
              {item.icon(active)}
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
