'use client'

import { Drawer } from 'vaul'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import type { Product } from '@/lib/types'
import { STRINGS } from '@/lib/strings'

type Props = {
  product: Product
  telegram: string
  onClose: () => void
}

type MediaItem = { type: 'video' | 'image'; url: string }

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function getTouchDistance(t: React.TouchList) {
  const dx = t[0].clientX - t[1].clientX
  const dy = t[0].clientY - t[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

export default function ProductSheet({ product, telegram, onClose }: Props) {
  const images = product.images.length > 0 ? product.images : (product.image ? [product.image] : [])

  // Единая медиа-лента: видео идёт первым слайдом, затем фото
  const media: MediaItem[] = [
    ...(product.video ? [{ type: 'video' as const, url: product.video }] : []),
    ...images.map((url) => ({ type: 'image' as const, url })),
  ]
  const hasMany = media.length > 1

  const [mediaIndex, setMediaIndex] = useState(0)
  const current: MediaItem | undefined = media[mediaIndex]
  const isVideo = current?.type === 'video'

  // zoom & pan (только для фото)
  const [scale, setScale] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const pinchStartDist = useRef(0)
  const pinchStartScale = useRef(1)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const lastTap = useRef(0)

  // сброс зума при смене слайда
  useEffect(() => {
    setScale(1); setPanX(0); setPanY(0)
  }, [mediaIndex])

  // ── жесты медиа: pinch zoom + свайп между слайдами + double-tap ────────────
  // vaul использует handleOnly={true} → drag-область только ручка сверху,
  // поэтому здесь наши жесты работают без конфликта.

  function onMediaTouchStart(e: React.TouchEvent) {
    if (!isVideo && e.touches.length === 2) {
      pinchStartDist.current = getTouchDistance(e.touches)
      pinchStartScale.current = scale
      return
    }
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY

    // double-tap → зум (только для фото)
    if (!isVideo) {
      const now = Date.now()
      if (now - lastTap.current < 300) {
        if (scale > 1) { setScale(1); setPanX(0); setPanY(0) }
        else { setScale(2.5) }
        lastTap.current = 0
        return
      }
      lastTap.current = now
    }
  }

  function onMediaTouchMove(e: React.TouchEvent) {
    if (isVideo) return
    if (e.touches.length === 2) {
      const dist = getTouchDistance(e.touches)
      const next = clamp(pinchStartScale.current * (dist / pinchStartDist.current), 1, 4)
      setScale(next)
      if (next <= 1) { setPanX(0); setPanY(0) }
    } else if (scale > 1) {
      const dx = e.touches[0].clientX - touchStartX.current
      const dy = e.touches[0].clientY - touchStartY.current
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      setPanX((p) => p + dx / scale)
      setPanY((p) => p + dy / scale)
    }
  }

  function onMediaTouchEnd(e: React.TouchEvent) {
    if (scale > 1 || !hasMany) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && mediaIndex < media.length - 1) setMediaIndex((i) => i + 1)
      if (dx > 0 && mediaIndex > 0) setMediaIndex((i) => i - 1)
    }
  }

  // ── telegram links ────────────────────────────────────────────────────────

  const tgAvailable = `https://t.me/${telegram}?text=${encodeURIComponent(
    `Меня интересует товар «${product.name}»`
  )}`
  const tgUnavailable = `https://t.me/${telegram}?text=${encodeURIComponent(
    `Здравствуйте! Подскажите, когда снова будет в наличии «${product.name}»?`
  )}`

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <Drawer.Root
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      handleOnly
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />

        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[92svh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none"
        >
          {/* Ручка + кнопка закрытия — drag-зона для vaul */}
          <div className="relative flex items-center justify-center pb-1 pt-3 shrink-0">
            <Drawer.Handle className="h-1 w-10 rounded-full bg-[#E0E0D8]" />
            <button
              onClick={onClose}
              className="absolute right-4 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#F0EFE9] text-[#6B6B6B]"
              aria-label="Закрыть"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          {/* Медиа — вертикальный формат 4:5, фото + видео в одной карусели */}
          <div
            className="relative aspect-[4/5] w-full shrink-0 select-none overflow-hidden bg-[#F5F5F0]"
            style={{ touchAction: scale > 1 ? 'none' : 'pan-y' }}
            onTouchStart={onMediaTouchStart}
            onTouchMove={onMediaTouchMove}
            onTouchEnd={onMediaTouchEnd}
          >
            {!current ? (
              <div className="flex h-full w-full items-center justify-center text-6xl">📦</div>
            ) : current.type === 'video' ? (
              <video
                key={current.url}
                ref={(el) => { if (el) el.muted = true }} // гарантированно без звука
                src={current.url}
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
            ) : (
              <Image
                key={current.url}
                src={current.url}
                alt={`${product.name} — ${mediaIndex + 1}`}
                fill
                sizes="100vw"
                className="object-cover"
                style={{
                  transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
                  willChange: 'transform',
                  transition: scale === 1 ? 'transform 0.2s' : 'none',
                }}
                priority
                draggable={false}
              />
            )}

            {product.isAvailable && product.discountPercent !== undefined && (
              <span className="absolute right-3 top-3 rounded-lg bg-[#C8332E] px-2 py-1 text-sm font-bold text-white">
                {STRINGS.discount(product.discountPercent)}
              </span>
            )}

            {!product.isAvailable && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="rounded-xl bg-black/70 px-4 py-1.5 text-sm font-semibold text-white">
                  Нет в наличии
                </span>
              </div>
            )}

            {/* Desktop arrows */}
            {hasMany && mediaIndex > 0 && (
              <button
                onClick={() => setMediaIndex((i) => i - 1)}
                className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/50 md:flex"
                aria-label="Назад"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </button>
            )}
            {hasMany && mediaIndex < media.length - 1 && (
              <button
                onClick={() => setMediaIndex((i) => i + 1)}
                className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/50 md:flex"
                aria-label="Вперёд"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </button>
            )}
          </div>

          {/* Точки-индикаторы (видео отмечено значком ▶) */}
          {hasMany && (
            <div className="flex shrink-0 items-center justify-center gap-1.5 py-2.5">
              {media.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setMediaIndex(i)}
                  aria-label={m.type === 'video' ? 'Видео' : `Фото ${i + 1}`}
                  className={`flex items-center justify-center rounded-full transition-all ${
                    m.type === 'video'
                      ? `h-3 w-3 ${i === mediaIndex ? 'bg-[#854F0B] text-white' : 'bg-[#D0CFC8] text-white'}`
                      : `h-1.5 ${i === mediaIndex ? 'w-4 bg-[#854F0B]' : 'w-1.5 bg-[#D0CFC8]'}`
                  }`}
                >
                  {m.type === 'video' && (
                    <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Скроллируемый контент */}
          <div className="overflow-y-auto px-4 pb-8 pt-3">
            <div className="mb-1 flex items-start justify-between gap-3">
              <h2 className="text-[18px] font-bold leading-snug text-[#1A1A1A]">
                {product.name}
              </h2>
              {hasMany && (
                <span className="mt-0.5 shrink-0 text-xs text-[#9A9A9A]">
                  {mediaIndex + 1} / {media.length}
                </span>
              )}
            </div>

            {/* Цена — только для товаров в наличии */}
            {product.isAvailable && (
              <div className="mb-3 flex items-baseline gap-2">
                {product.discountedPrice !== undefined ? (
                  <>
                    <span className="text-xl font-bold text-[#C8332E]">
                      {product.discountedPrice.toLocaleString('ru-RU')} {STRINGS.currency}
                    </span>
                    <span className="text-sm text-[#9A9A9A] line-through">
                      {product.price.toLocaleString('ru-RU')} {STRINGS.currency}
                    </span>
                  </>
                ) : (
                  <span className="text-xl font-semibold text-[#1A1A1A]">
                    {product.price.toLocaleString('ru-RU')} {STRINGS.currency}
                  </span>
                )}
              </div>
            )}

            {product.description && (
              <p className="mb-5 text-[15px] leading-relaxed text-[#4A4A4A]">
                {product.description}
              </p>
            )}

            {product.isAvailable ? (
              <a
                href={tgAvailable}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#2AABEE] font-semibold text-white active:opacity-80"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.93 6.86-1.686 7.948c-.127.568-.46.707-.934.44l-2.582-1.902-1.246 1.198c-.138.138-.253.253-.519.253l.185-2.627 4.778-4.315c.208-.185-.045-.287-.322-.102L7.965 14.5l-2.54-.793c-.552-.172-.563-.552.115-.817l9.827-3.79c.46-.167.863.115.563.76z"/>
                </svg>
                Написать про этот товар
              </a>
            ) : (
              <a
                href={tgUnavailable}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl border border-[#D0CFC8] bg-white font-semibold text-[#6B6B6B] active:opacity-80"
              >
                Спросить когда будет
              </a>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
