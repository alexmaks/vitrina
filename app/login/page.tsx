'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'vitrina_kappa_bot'

type Step = 'idle' | 'waiting' | 'done'

export default function LoginPage() {
  useRouter() // kept for potential future use
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tokenRef = useRef<string | null>(null)
  const botUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // Опрос сервера каждые 2 сек
  function startPolling(token: string) {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/poll?token=${token}`)
        const data = await res.json()
        if (data.ready) {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setStep('done')
          window.location.href = `/api/auth/complete?token=${token}`
        } else if (data.error === 'expired') {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setError('Время ожидания истекло. Попробуйте снова.')
          setStep('idle')
        }
      } catch {
        // сетевая ошибка — пробуем снова
      }
    }, 2000)
  }

  // Когда пользователь возвращается из Telegram — мгновенная проверка
  useEffect(() => {
    const onVisible = () => {
      if (step === 'waiting' && tokenRef.current) {
        fetch(`/api/auth/poll?token=${tokenRef.current}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.ready) {
              if (pollRef.current) clearInterval(pollRef.current)
              setStep('done')
              window.location.href = `/api/auth/complete?token=${tokenRef.current}`
            }
          })
          .catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [step])

  async function handleLogin() {
    setError(null)
    try {
      const res = await fetch('/api/auth/bot-init')
      if (!res.ok) throw new Error('Server error')
      const { token, botUrl } = await res.json()

      tokenRef.current = token
      botUrlRef.current = botUrl
      setStep('waiting')

      window.open(botUrl, '_blank')
      startPolling(token)
    } catch {
      setError('Не удалось соединиться с сервером. Попробуйте снова.')
    }
  }

  function handleRetry() {
    if (pollRef.current) clearInterval(pollRef.current)
    tokenRef.current = null
    botUrlRef.current = null
    setStep('idle')
    setError(null)
  }

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

        {/* ── Экран: ожидание ── */}
        {step === 'waiting' && (
          <div className="rounded-2xl border border-[#E5E5E0] bg-white p-6">
            <div className="mb-4 flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="inline-block h-2.5 w-2.5 animate-bounce rounded-full bg-[#2AABEE]"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="mb-1 font-semibold text-[#1A1A1A]">
              Ожидаем подтверждения
            </p>
            <p className="mb-4 text-sm text-[#6B6B6B]">
              В Telegram нажмите <b>Start</b> — страница обновится автоматически
            </p>
            {botUrlRef.current && (
              <a
                href={botUrlRef.current}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#2AABEE] text-sm font-semibold text-white"
              >
                Открыть Telegram снова
              </a>
            )}
            <button
              onClick={handleRetry}
              className="text-sm text-[#9A9A9A] underline underline-offset-2"
            >
              Начать заново
            </button>
          </div>
        )}

        {/* ── Экран: успех ── */}
        {step === 'done' && (
          <div className="rounded-2xl border border-[#E5E5E0] bg-white p-6">
            <p className="mb-2 text-4xl">✅</p>
            <p className="font-semibold text-[#1A1A1A]">Вы вошли!</p>
            <p className="mt-1 text-sm text-[#6B6B6B]">Открываем витрину…</p>
          </div>
        )}

        {/* ── Экран: начальный ── */}
        {step === 'idle' && (
          <>
            <button
              onClick={handleLogin}
              className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#2AABEE] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-75"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
              </svg>
              Войти через Telegram
            </button>

            {error && (
              <p className="mt-3 text-sm text-red-500">{error}</p>
            )}

            <p className="mt-3 text-xs text-[#9A9A9A]">
              Откроется Telegram — нажмите <b>Start</b>
            </p>
          </>
        )}

        <p className="mt-8 text-xs text-[#9A9A9A]">
          Нажимая «Войти», вы соглашаетесь с{' '}
          <a href="/privacy" className="underline underline-offset-2">
            политикой конфиденциальности
          </a>
        </p>
      </div>
    </div>
  )
}
