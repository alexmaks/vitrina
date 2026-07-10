// Отправка события статистики (посещение / просмотр товара / клик «Написать»).
// Дедуп в рамках сессии — чтобы один посетитель не накручивал цифры.
export type TrackKind = 'visit' | 'product' | 'contact'

export function trackEvent(slug: string, kind: TrackKind, productId?: string) {
  if (typeof window === 'undefined') return

  const dedupeKey = `trk_${slug}_${kind}_${productId ?? ''}`
  try {
    if (sessionStorage.getItem(dedupeKey)) return
    sessionStorage.setItem(dedupeKey, '1')
  } catch {
    // sessionStorage может быть недоступен — просто продолжаем
  }

  const payload = JSON.stringify({ slug, kind, productId })

  // sendBeacon надёжно отправляет даже при уходе со страницы
  try {
    const blob = new Blob([payload], { type: 'application/json' })
    if (navigator.sendBeacon && navigator.sendBeacon('/api/track', blob)) return
  } catch {
    // упадём в fetch ниже
  }

  fetch('/api/track', {
    method: 'POST',
    body: payload,
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  }).catch(() => {})
}
