'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

declare global {
  interface Window {
    onTelegramAuth: (user: Record<string, string>) => void
  }
}

const BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'vitrina_kappa_bot'
const BOT_URL = `https://t.me/${BOT_USERNAME}`

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Callback от Telegram Login Widget (работает на десктопе)
    window.onTelegramAuth = async (user) => {
      try {
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        })
        if (!res.ok) return
        const { redirectUrl } = await res.json()
        router.push(redirectUrl)
      } catch (err) {
        console.error('Auth failed:', err)
      }
    }

    const domain = process.env.NEXT_PUBLIC_DOMAIN ?? window.location.origin
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '12')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-auth-url', `${domain}/api/auth/telegram`)
    script.setAttribute('data-request-access', 'write')
    script.async = true

    const container = document.getElementById('telegram-login-container')
    if (container) container.appendChild(script)
  }, [router])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#FAFAF7] px-5">
      <div className="w-full max-w-sm text-center">
        {/* Логотип */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#854F0B] text-3xl text-white shadow-lg">
            В
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-[#1A1A1A]">
          Витрина в кармане
        </h1>
        <p className="mb-8 text-[15px] text-[#6B6B6B]">
          Войдите через Telegram, чтобы управлять своей витриной
        </p>

        {/* Telegram Login Widget (десктоп) */}
        <div id="telegram-login-container" className="flex justify-center" />

        {/* Разделитель */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#E5E5E0]" />
          <span className="text-xs text-[#9A9A9A]">или с телефона</span>
          <div className="h-px flex-1 bg-[#E5E5E0]" />
        </div>

        {/* Кнопка для мобильных через бота */}
        <a
          href={BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#2AABEE] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-75"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
          </svg>
          Открыть бота Telegram
        </a>
        <p className="mt-2 text-xs text-[#9A9A9A]">
          Откроется бот → нажмите <b>Start</b> → получите кнопку «Войти»
        </p>

        <p className="mt-6 text-xs text-[#9A9A9A]">
          Нажимая «Войти», вы соглашаетесь с{' '}
          <a href="/privacy" className="underline underline-offset-2">
            политикой конфиденциальности
          </a>
        </p>
      </div>
    </div>
  )
}
