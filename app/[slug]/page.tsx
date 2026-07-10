import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getMerchantBySlug, getAllPublishedSlugs } from '@/lib/merchants-db'
import StorefrontHeader from '@/components/StorefrontHeader'
import SaleBanner from '@/components/SaleBanner'
import ProductGallery from '@/components/ProductGallery'
import ContactButton from '@/components/ContactButton'
import TrackVisit from '@/components/TrackVisit'

interface PageProps {
  params: Promise<{ slug: string }>
}

// Обновляем страницу каждые 60 секунд (ISR)
export const revalidate = 60

// Генерируем статические маршруты из Supabase
export async function generateStaticParams() {
  const slugs = await getAllPublishedSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const merchant = await getMerchantBySlug(slug)
  if (!merchant) return {}

  const domain = process.env.NEXT_PUBLIC_DOMAIN ?? 'https://vitrina-kappa.vercel.app'
  const ogImage = `${domain}/og/${slug}.jpg`
  const url = `${domain}/${slug}`

  return {
    title: merchant.name,
    description: merchant.tagline,
    openGraph: {
      title: merchant.name,
      description: merchant.tagline,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: 'website',
      url,
    },
    twitter: {
      card: 'summary_large_image',
      title: merchant.name,
      description: merchant.tagline,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: url,
    },
  }
}

export default async function StorefrontPage({ params }: PageProps) {
  const { slug } = await params
  const merchant = await getMerchantBySlug(slug)

  if (!merchant) {
    notFound()
  }

  return (
    <div className="page-container flex min-h-svh flex-col">
      <TrackVisit slug={slug} />
      <StorefrontHeader merchant={merchant} />
      {merchant.sale?.isActive && <SaleBanner sale={merchant.sale} />}
      <div className="flex-1">
        <ProductGallery
          products={merchant.products}
          telegram={merchant.telegram}
          accentColor={merchant.accentColor}
          slug={slug}
        />
      </div>
      <ContactButton
        telegram={merchant.telegram}
        merchantName={merchant.name}
        accentColor={merchant.accentColor}
        slug={slug}
      />
    </div>
  )
}
