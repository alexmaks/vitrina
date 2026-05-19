import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getMerchantBySlug, getAllPublishedSlugs } from '@/lib/merchants-db'
import StorefrontHeader from '@/components/StorefrontHeader'
import SaleBanner from '@/components/SaleBanner'
import ProductGrid from '@/components/ProductGrid'
import ContactButton from '@/components/ContactButton'

interface PageProps {
  params: Promise<{ slug: string }>
}

// Только явный revalidatePath — без автоматического TTL
export const revalidate = false
export const dynamic = 'force-static'

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
      <StorefrontHeader merchant={merchant} />
      {merchant.sale?.isActive && <SaleBanner sale={merchant.sale} />}
      <div className="flex-1">
        <ProductGrid products={merchant.products} />
      </div>
      <ContactButton
        telegram={merchant.telegram}
        merchantName={merchant.name}
      />
    </div>
  )
}
