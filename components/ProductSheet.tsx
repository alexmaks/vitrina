'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
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

  const [visible, setVisible] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)

  // drag-to-dismiss
  const [sheetY, setSheetY] = useState(0)
  const dragStartY = useRef(0)
  const isDragging = useRef(false)

  // zoom & pan
  const [scale, setScale] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const pinchStartDist = useRef(0)
  const pinchStartScale = useRef(1)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const lastTap = useRef(0)

  // slide-in animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // reset zoom when photo changes
  useEffect(() => {
    setScale(1); setPanX(0); setPanY(0)
  }, [photoIndex])

  const close = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 280)
  }, [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [close])

  // ── drag handle: swipe down to dismiss ────────────────────────────────────

  function onHandleTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY
    isDragging.current = true
  }

  function onHandleTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return
    const delta = e.touches[0].clientY - dragStartY.current
    if (delta > 0) setSheetY(delta)
  }

  function onHandleTouchEnd() {
    isDragging.current = false
    if (sheetY > 90) {
      close()
    } else {
      setSheetY(0)
    }
  }

  // ── image: pinch zoom + swipe photos + double-tap ─────────────────────────

  function onImageTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchStartDist.current = getTouchDistance(e.touches)
      pinchStartScale.current = scale
    } else {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY

      // double-tap
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

    // Горизонтальный свайп → смена фото
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && photoIndex < images.length - 1) setPhotoIndex((i) => i + 1)
      if (dx > 0 && photoIndex > 0) setPhotoIndex((i) => i - 1)
    }
  }

  // ── telegram links ────────────────────────────────────────────────────────

  const tgAsk = `https://t.me/${telegram}?text=${encodeURIComponent(
    `Меня интересует товар «${product.name}»`
  )}`
  const tgAvail = `https://t.me/${telegram}?text=${encodeURIComponent(
    `Когда появится в наличии «${product.name}»?`
  )}`

  const currentImage = images[photoIndex]

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      {/* backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={close}
        aria-hidden="true"
      />

      {/* sheet */}
      <div
        className="relative z-10 w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-out"
        style={{
          maxHeight: '92svh',
          transform: `translateY(${visible ? sheetY : '100%'}px)`,
        }}
      >
        {/* drag handle */}
        <div
          className="flex cursor-grab select-none flex-col items-center pb-2 pt-3 active:cursor-grabbing"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
        >
          <div className="h-1 w-10 rounded-full bg-[#E0E0D8]" />
        </div>

        {/* image */}
        <div
          className="relative aspect-square w-full select-none overflow-hidden bg-[#F5F5F0]"
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

          {/* discount badge */}
          {product.isAvailable && product.discountPercent !== undefined && (
            <span className="absolute right-3 top-3 rounded-lg bg-[#C8332E] px-2 py-1 text-sm font-bold text-white">
              {STRINGS.discount(product.discountPercent)}
            </span>
          )}

          {/* unavailable overlay */}
          {!product.isAvailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="rounded-xl bg-black/70 px-4 py-1.5 text-sm font-semibold text-white">
                Нет в наличии
              </span>
            </div>
          )}

          {/* Desktop arrows (только когда несколько фото) */}
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

          {/* Zoom hint */}
          {scale === 1 && !hasMany && currentImage && (
            <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/30 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
              Двойной тап — увеличить
            </span>
          )}
        </div>

        {/* Dots — только если несколько фото */}
        {hasMany && (
          <div className="flex justify-center gap-1.5 py-2.5">
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

        {/* scrollable content */}
        <div className="overflow-y-auto px-4 pb-8 pt-3" style={{ maxHeight: '45svh' }}>
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

          <div className="mb-3 flex items-baseline gap-2">
            {product.isAvailable && product.discountedPrice !== undefined ? (
              <>
                <span className="text-xl font-bold text-[#C8332E]">
                  {product.discountedPrice.toLocaleString('ru-RU')} {STRINGS.currency}
                </span>
                <span className="text-sm text-[#9A9A9A] line-through">
                  {product.price.toLocaleString('ru-RU')} {STRINGS.currency}
                </span>
              </>
            ) : (
              <span className={`text-xl font-semibold ${product.isAvailable ? 'text-[#1A1A1A]' : 'text-[#9A9A9A]'}`}>
                {product.price.toLocaleString('ru-RU')} {STRINGS.currency}
              </span>
            )}
          </div>

          {product.description && (
            <p className="mb-5 text-[15px] leading-relaxed text-[#4A4A4A]">
              {product.description}
            </p>
          )}

          {product.isAvailable ? (
            <a
              href={tgAsk}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#2AABEE] font-semibold text-white transition-opacity active:opacity-80"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.93 6.86-1.686 7.948c-.127.568-.46.707-.934.44l-2.582-1.902-1.246 1.198c-.138.138-.253.253-.519.253l.185-2.627 4.778-4.315c.208-.185-.045-.287-.322-.102L7.965 14.5l-2.54-.793c-.552-.172-.563-.552.115-.817l9.827-3.79c.46-.167.863.115.563.76z"/>
              </svg>
              Написать про этот товар
            </a>
          ) : (
            <a
              href={tgAvail}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl border border-[#D0CFC8] bg-white font-semibold text-[#6B6B6B] transition-opacity active:opacity-80"
            >
              Спросить про наличие
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
