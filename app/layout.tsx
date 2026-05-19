import type { Metadata, Viewport } from 'next'
import './globals.css'
import YandexMetrika from '@/components/YandexMetrika'
import { STRINGS } from '@/lib/strings'

export const metadata: Metadata = {
  title: STRINGS.homeTitle,
  description: STRINGS.homeSubtitle,
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Витрина',
    statusBarStyle: 'default',
  },
  icons: {
    apple: '/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#854F0B',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className="h-full">
      <body className="min-h-full bg-[#FAFAF7]">
        {children}
        <YandexMetrika />
      </body>
    </html>
  )
}
