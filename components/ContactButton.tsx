'use client'

import { ymReachGoal } from './YandexMetrika'
import { STRINGS } from '@/lib/strings'

interface ContactButtonProps {
  telegram: string
  merchantName: string
}

// SVG-иконка Telegram
function TelegramIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.93 6.86-1.686 7.948c-.127.568-.46.707-.934.44l-2.582-1.902-1.246 1.198c-.138.138-.253.253-.519.253l.185-2.627 4.778-4.315c.208-.185-.045-.287-.322-.102L7.965 14.5l-2.54-.793c-.552-.172-.563-.552.115-.817l9.827-3.79c.46-.167.863.115.563.76z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function ContactButton({ telegram, merchantName }: ContactButtonProps) {
  const message = encodeURIComponent(STRINGS.telegramMessage)
  const href = `https://t.me/${telegram}?text=${message}`

  function handleClick() {
    ymReachGoal('contact_click')
  }

  return (
    <div className="sticky bottom-0 px-3 pb-4 pt-2">
      {/* Градиент-fade под кнопкой чтобы она не обрезала карточки */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-[#FAFAF7] to-transparent"
        aria-hidden="true"
      />
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#2AABEE] font-semibold text-white shadow-sm transition-opacity active:opacity-80"
        aria-label={`Написать ${merchantName} в Telegram`}
      >
        <TelegramIcon />
        <span>{STRINGS.contactButton(merchantName)}</span>
      </a>
    </div>
  )
}
