'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Telegram Login Widget вызывает window.onTelegramAuth после авторизации
declare global {
  interface Window {
    onTelegramAuth: (user: Record<string, string>) => void
  }
}

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Callback от Telegram Login Widget
    window.onTelegramAuth = async (user) => {
      try {
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        })
        if (!res.ok) {
          console.error('Auth error:', await res.text())
          return
        }
        const { redirectUrl } = await res.json()
        router.push(redirectUrl)
      } catch (err) {
        console.error('Auth failed:', err)
      }
    }

    // Динамически добавляем Telegram Login Widget
    const botName =
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'vitrina_kappa_bot'
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', botName)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '12')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
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

        {/* Контейнер для Telegram Login Widget */}
        <div
          id="telegram-login-container"
          className="flex justify-center"
        />

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
