'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { useMerchant } from '@/components/admin/MerchantContext'
import { useRouter } from 'next/navigation'

const ACCENT_COLORS = [
  { value: '#854F0B', label: 'Коричневый' },
  { value: '#2AABEE', label: 'Синий' },
  { value: '#27AE60', label: 'Зелёный' },
  { value: '#E74C3C', label: 'Красный' },
  { value: '#8E44AD', label: 'Фиолетовый' },
  { value: '#F39C12', label: 'Жёлтый' },
]

const schema = z.object({
  name: z.string().min(2).max(80),
  tagline: z.string().max(120).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  contactTelegram: z.string().min(1).max(60),
})

type FormValues = z.infer<typeof schema>

export default function SettingsPage() {
  const merchant = useMerchant()
  const router = useRouter()
  const [avatar, setAvatar] = useState(merchant.avatar ?? '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: merchant.name,
      tagline: merchant.tagline ?? '',
      accentColor: merchant.accentColor,
      contactTelegram: merchant.telegram,
    },
  })

  const accentColor = watch('accentColor')

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', 'avatar')
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const { url } = await res.json()
        setAvatar(url)
      }
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function onSubmit(values: FormValues) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, avatarUrl: avatar }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        router.refresh()
      } else {
        const err = await res.json()
        setError(err.error ?? 'Ошибка сохранения')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-5 py-6">
      <h1 className="mb-6 text-xl font-bold text-[#1A1A1A]">Настройки</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Аватар */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Фото профиля
          </label>
          <div className="flex items-center gap-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="relative h-16 w-16 cursor-pointer overflow-hidden rounded-full border-2 border-[#E5E5E0] bg-[#F5F5F0] transition-colors hover:border-[#854F0B]"
            >
              {avatar ? (
                <Image src={avatar} alt="Аватар" fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl text-[#9A9A9A]">
                  👤
                </div>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-sm text-[#854F0B] underline underline-offset-2"
            >
              Изменить фото
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        {/* Название */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Название
          </label>
          <input
            {...register('name')}
            className="w-full rounded-xl border border-[#E5E5E0] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#854F0B] focus:ring-1 focus:ring-[#854F0B]"
          />
        </div>

        {/* Подзаголовок */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Подзаголовок
          </label>
          <input
            {...register('tagline')}
            className="w-full rounded-xl border border-[#E5E5E0] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#854F0B] focus:ring-1 focus:ring-[#854F0B]"
          />
        </div>

        {/* Цвет акцента */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[#1A1A1A]">
            Цвет оформления
          </label>
          <div className="flex gap-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setValue('accentColor', color.value)}
                className="h-9 w-9 rounded-full transition-transform active:scale-95"
                style={{ backgroundColor: color.value }}
                title={color.label}
                aria-label={color.label}
              >
                {accentColor === color.value && (
                  <svg viewBox="0 0 24 24" fill="none" className="m-auto h-5 w-5">
                    <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Telegram */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Telegram для связи
          </label>
          <div className="flex items-center rounded-xl border border-[#E5E5E0] bg-white focus-within:border-[#854F0B] focus-within:ring-1 focus-within:ring-[#854F0B]">
            <span className="pl-4 text-[15px] text-[#9A9A9A]">@</span>
            <input
              {...register('contactTelegram')}
              placeholder="username"
              className="flex-1 bg-transparent py-3 pr-4 text-[15px] outline-none"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex min-h-[52px] items-center justify-center rounded-2xl bg-[#854F0B] font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {saved ? '✓ Сохранено' : saving ? 'Сохраняю...' : 'Сохранить'}
        </button>

        {/* Выход */}
        <form action="/api/auth/logout" method="POST" className="mt-2">
          <button
            type="submit"
            className="w-full rounded-2xl border border-[#E5E5E0] py-3 text-sm font-medium text-[#9A9A9A] transition-colors hover:text-[#1A1A1A]"
          >
            Выйти
          </button>
        </form>
      </form>
    </div>
  )
}
