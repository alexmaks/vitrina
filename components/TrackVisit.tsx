'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/track'

// Считает посещение витрины один раз за сессию.
export default function TrackVisit({ slug }: { slug: string }) {
  useEffect(() => {
    trackEvent(slug, 'visit')
  }, [slug])
  return null
}
