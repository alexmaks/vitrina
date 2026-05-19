'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

const YM_ID = Number(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID)

// Отправка события в Яндекс.Метрику
export function ymReachGoal(goal: string) {
  if (typeof window !== 'undefined' && window.ym && YM_ID) {
    window.ym(YM_ID, 'reachGoal', goal)
  }
}

function initYM() {
  if (!YM_ID) return

  type YmFn = { (...args: unknown[]): void; a?: unknown[]; l?: number }
  const win = window as unknown as { [key: string]: YmFn }
  const i = 'ym'
  const r = 'https://mc.yandex.ru/metrika/tag.js?id=' + YM_ID

  win[i] =
    win[i] ||
    function (...args: unknown[]) {
      ;(win[i].a = win[i].a || []).push(args)
    }
  win[i].l = 1 * (new Date() as unknown as number)

  for (let j = 0; j < document.scripts.length; j++) {
    if (document.scripts[j].src === r) return
  }

  const k = document.createElement('script') as HTMLScriptElement
  const a = document.getElementsByTagName('script')[0]
  k.async = true
  // defer загрузка скрипта метрики — не блокирует рендер
  k.defer = true
  k.src = r
  a.parentNode?.insertBefore(k, a)

  window.ym?.(YM_ID, 'init', {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: 'dataLayer',
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  })
}

export default function YandexMetrika() {
  useEffect(() => {
    if (!YM_ID) return

    // Откладываем инициализацию до idle — не блокируем LCP/FID
    if ('requestIdleCallback' in window) {
      requestIdleCallback(initYM, { timeout: 3000 })
    } else {
      // Fallback для Safari
      setTimeout(initYM, 500)
    }
  }, [])

  if (!YM_ID) return null

  return (
    <noscript>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://mc.yandex.ru/watch/${YM_ID}`}
          style={{ position: 'absolute', left: '-9999px' }}
          alt=""
        />
      </div>
    </noscript>
  )
}
