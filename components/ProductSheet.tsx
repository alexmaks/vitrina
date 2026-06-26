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
  const hasMany = images.length > 1

  const [photoIndex, setPhotoIndex] = useState(0)

  // zoom & pan
  const [scale, setScale] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const pinchStartDist = useRef(0)
  const pinchStartScale = useRef(1)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const lastTap = useRef(0)

  // reset zoom when photo changes
  useEffect(() => {
    setScale(1); setPanX(0); setPanY(0)
  }, [photoIndex])

  // ── image touch: pinch zoom + photo swipe + double-tap ────────────────────
  // Баг 3: vaul использует handleOnly={true}, поэтому drag-область только ручка.
  // Изображение и контент НЕ захватываются vaul — здесь работают наши жесты.

  function onImageTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchStartDist.current = getTouchDistance(e.touches)
      pinchStartScale.current = scale
    } else {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY

      // double-tap → zoom toggle
      const now = Date.now()
      if (now - lastTap.current < 300) {
        if (scale > 1) {
          setScale(1); setPanX(0); setPanY(0)
        } else {
          setScale(2.5)
        }
        lastTap.current = 0
        return
      }
      lastTap.current = now
    }
  }

  function onImageTouchMove(e: React.TouchEvent) {
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

  function onImageTouchEnd(e: React.TouchEvent) {
    if (scale > 1 || !hasMany) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && photoIndex < images.length - 1) setPhotoIndex((i) => i + 1)
      if (dx > 0 && photoIndex > 0) setPhotoIndex((i) => i - 1)
    }
  }

  // ── telegram links ────────────────────────────────────────────────────────

  const tgAvailable = `https://t.me/${telegram}?text=${encodeURIComponent(
    `Меня интересует товар «${product.name}»`
  )}`
  const tgUnavailable = `https://t.me/${telegram}?text=${encodeURIComponent(
    `Здравствуйте! Подскажите, когда снова будет в наличии «${product.name}»?`
  )}`

  const currentImage = images[photoIndex]

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <Drawer.Root
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      // Баг 3: handleOnly=true — свайп-dismiss работает ТОЛЬКО с ручки сверху.
      // Фото и контент получают свои жесты без конфликта с vaul.
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
            {/* Баг 3: крестик — резервный способ закрыть без жеста */}
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

          {/* Фото — vaul НЕ перехватывает (handleOnly), наши жесты работают */}
          <div
            className="relative aspect-square w-full shrink-0 select-none overflow-hidden bg-[#F5F5F0]"
            style={{ touchAction: scale > 1 ? 'none' : 'pan-y' }}
            onTouchStart={onImageTouchStart}
            onTouchMove={onImageTouchMove}
            onTouchEnd={onImageTouchEnd}
          >
            {currentImage ? (
              <Image
                key={currentImage}
                src={currentImage}
                alt={`${product.name} — фото ${photoIndex + 1}`}
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
            ) : (
              <div className="flex h-full w-full items-center justify-center text-6xl">📦</div>
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
            {hasMany && photoIndex > 0 && (
              <button
                onClick={() => setPhotoIndex((i) => i - 1)}
                className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/50 md:flex"
                aria-label="Предыдущее фото"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </button>
            )}
            {hasMany && photoIndex < images.length - 1 && (
              <button
                onClick={() => setPhotoIndex((i) => i + 1)}
                className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/50 md:flex"
                aria-label="Следующее фото"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </button>
            )}
          </div>

          {/* Dots */}
          {hasMany && (
            <div className="flex shrink-0 justify-center gap-1.5 py-2.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIndex(i)}
                  aria-label={`Фото ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === photoIndex ? 'w-4 bg-[#854F0B]' : 'w-1.5 bg-[#D0CFC8]'
                  }`}
                />
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
                  {photoIndex + 1} / {images.length}
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

            {/* Короткое видео товара */}
            {product.video && (
              <div className="mb-4 overflow-hidden rounded-2xl bg-black">
                <video
                  src={product.video}
                  className="max-h-[70svh] w-full"
                  controls
                  playsInline
                  preload="metadata"
                />
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
              // Доп: кнопка «Спросить когда будет» с правильным текстом в Telegram
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
