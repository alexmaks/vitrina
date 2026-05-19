'use client'

import { useState, useEffect } from 'react'
import { useMerchant } from '@/components/admin/MerchantContext'
import Image from 'next/image'

export default function SharePage() {
  const merchant = useMerchant()
  const domain = process.env.NEXT_PUBLIC_DOMAIN ?? 'https://vitrina-kappa.vercel.app'
  const url = `${domain}/${merchant.slug}`

  const [copied, setCopied] = useState(false)
  const [qrUrl, setQrUrl] = useState('')

  useEffect(() => {
    if (!merchant.slug) return
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(url, { width: 300, margin: 2 }).then(setQrUrl)
    })
  }, [url, merchant.slug])

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownloadQr() {
    if (!qrUrl) return
    const a = document.createElement('a')
    a.href = qrUrl
    a.download = `vitrina-${merchant.slug}-qr.png`
    a.click()
  }

  if (!merchant.slug) {
    return (
      <div className="px-5 py-6 text-center">
        <p className="text-[#6B6B6B]">
          Сначала настройте адрес витрины в разделе «Ещё → Настройки»
        </p>
      </div>
    )
  }

  return (
    <div className="px-5 py-6">
      <h1 className="mb-6 text-xl font-bold text-[#1A1A1A]">Поделиться</h1>

      {/* Ссылка */}
      <div className="mb-6 rounded-2xl border border-[#E5E5E0] bg-white p-4">
        <p className="mb-3 text-sm font-medium text-[#6B6B6B]">Ссылка на витрину</p>
        <div className="flex items-center gap-2">
          <p className="flex-1 truncate text-[15px] font-medium text-[#1A1A1A]">
            {url}
          </p>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-xl bg-[#F5F5F0] px-4 py-2 text-sm font-medium text-[#854F0B] transition-colors active:bg-[#EDE8E0]"
          >
            {copied ? '✓ Скопировано' : 'Копировать'}
          </button>
        </div>
      </div>

      {/* Кнопки шеринга */}
      <div className="mb-6 flex gap-3">
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Моя витрина: ${merchant.name}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2AABEE] py-3 font-semibold text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.184 13.26l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.97.3z"/>
          </svg>
          Telegram
        </a>

        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${merchant.name}: ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3 font-semibold text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm4.96 13.41c-.2.54-1.19 1.05-1.64 1.12-.45.07-1 .09-1.62-.1-.37-.12-.86-.28-1.48-.56-2.59-1.12-4.3-3.74-4.43-3.91-.13-.17-1.06-1.41-1.06-2.69s.67-1.91.91-2.17c.24-.26.52-.32.69-.32l.5.01c.16 0 .38-.06.59.45.22.52.74 1.79.81 1.92.07.13.11.28.02.45-.09.17-.13.27-.26.42-.13.15-.27.33-.39.44-.13.12-.26.25-.11.49.15.24.66 1.09 1.42 1.76.97.87 1.79 1.14 2.04 1.27.25.13.39.11.54-.07.15-.18.63-.74.8-.99.17-.25.34-.21.57-.12.23.08 1.48.7 1.73.82.25.13.42.19.48.3.07.11.07.63-.13 1.17z"/>
          </svg>
          WhatsApp
        </a>
      </div>

      {/* QR-код */}
      <div className="rounded-2xl border border-[#E5E5E0] bg-white p-4 text-center">
        <p className="mb-4 text-sm font-medium text-[#6B6B6B]">QR-код</p>
        {qrUrl ? (
          <>
            <Image
              src={qrUrl}
              alt="QR-код витрины"
              width={200}
              height={200}
              className="mx-auto mb-4 rounded-xl"
              unoptimized
            />
            <button
              onClick={handleDownloadQr}
              className="rounded-xl border border-[#E5E5E0] px-5 py-2.5 text-sm font-medium text-[#1A1A1A] transition-colors active:bg-[#F5F5F0]"
            >
              Скачать QR
            </button>
          </>
        ) : (
          <div className="mx-auto h-[200px] w-[200px] animate-pulse rounded-xl bg-[#F5F5F0]" />
        )}
      </div>

      {/* Открыть витрину */}
      <a
        href={`/${merchant.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-[#854F0B] font-semibold text-[#854F0B] transition-colors active:bg-[#FFF3E0]"
      >
        Открыть мою витрину ↗
      </a>
    </div>
  )
}
