import type { MetadataRoute } from 'next'
import { getAllPublishedSlugs } from '@/lib/merchants-db'

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN ?? 'https://vitrina-kappa.vercel.app'

export const revalidate = 3600 // пересчитываем раз в час

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getAllPublishedSlugs()
  const now = new Date()

  return [
    {
      url: `${DOMAIN}/`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...slugs.map((slug) => ({
      url: `${DOMAIN}/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    })),
  ]
}
