'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toSlug, isSlugValid } from '@/lib/slugify'
import { useMerchant } from '@/components/admin/MerchantContext'

const schema = z.object({
  name: z.string().min(2, 'Минимум 2 символа').max(80),
  tagline: z.string().max(120).optional(),
  slug: z
    .string()
    .min(3, 'Минимум 3 символа')
    .max(40, 'Максимум 40 символов')
    .regex(/^[a-z0-9-]+$/, 'Только латиница, цифры и дефис'),
})

type FormValues = z.infer<typeof schema>

export default function SetupPage() {
  const merchant = useMerchant()
  const router = useRouter()
  const [slugStatus, setSlugStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: merchant.name ?? '',
      tagline: merchant.tagline ?? '',
      slug: merchant.slug ?? '',
    },
  })

  const nameValue = watch('name')
  const slugValue = watch('slug')

  // Авто-генерация slug из имени
  useEffect(() => {
    if (!merchant.slug) {
      setValue('slug', toSlug(nameValue ?? ''))
    }
  }, [nameValue, merchant.slug, setValue])

  // Debounce проверки slug
  const checkSlug = useCallback(
    async (slug: string) => {
      if (!isSlugValid(slug)) {
        setSlugStatus('invalid')
        return
      }
      // Пропускаем если это текущий slug мастера
      if (slug === merchant.slug) {
        setSlugStatus('available')
        return
      }
      setSlugStatus('checking')
      try {
        const res = await fetch(`/api/slug-check?slug=${encodeURIComponent(slug)}`)
        const data = await res.json()
        setSlugStatus(data.available ? 'available' : 'taken')
      } catch {
        setSlugStatus('idle')
      }
    },
    [merchant.slug],
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      if (slugValue) checkSlug(slugValue)
    }, 500)
    return () => clearTimeout(timer)
  }, [slugValue, checkSlug])

  async function onSubmit(values: FormValues) {
    if (slugStatus === 'taken' || slugStatus === 'invalid') return
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        setSaveError(err.error ?? 'Ошибка сохранения')
      } else {
        router.push('/admin/products')
        router.refresh()
      }
    } catch {
      setSaveError('Ошибка сети')
    } finally {
      setSaving(false)
    }
  }

  const slugStatusText: Record<string, { text: string; color: string }> = {
    idle: { text: '', color: '' },
    checking: { text: 'Проверяю...', color: 'text-[#9A9A9A]' },
    available: { text: '✓ Доступен', color: 'text-green-600' },
    taken: { text: '✗ Уже занят', color: 'text-red-500' },
    invalid: { text: 'Только латиница, цифры и дефис', color: 'text-red-500' },
  }

  return (
    <div className="px-5 py-8">
      <h1 className="mb-2 text-2xl font-bold text-[#1A1A1A]">Настройте витрину</h1>
      <p className="mb-8 text-[15px] text-[#6B6B6B]">
        Заполните информацию о себе, чтобы покупатели могли вас найти.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Название */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Ваше имя / название <span className="text-red-500">*</span>
          </label>
          <input
            {...register('name')}
            placeholder="Носки от бабы Зины"
            className="w-full rounded-xl border border-[#E5E5E0] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#854F0B] focus:ring-1 focus:ring-[#854F0B]"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Подзаголовок */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Подзаголовок
          </label>
          <input
            {...register('tagline')}
            placeholder="Тёплые носки ручной вязки"
            className="w-full rounded-xl border border-[#E5E5E0] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#854F0B] focus:ring-1 focus:ring-[#854F0B]"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Адрес витрины <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center rounded-xl border border-[#E5E5E0] bg-white focus-within:border-[#854F0B] focus-within:ring-1 focus-within:ring-[#854F0B]">
            <span className="pl-4 text-[15px] text-[#9A9A9A]">vitrina.app/</span>
            <input
              {...register('slug')}
              placeholder="baba-zina"
              className="flex-1 bg-transparent py-3 pr-4 text-[15px] outline-none"
            />
          </div>
          {slugStatus !== 'idle' && (
            <p className={`mt-1 text-sm ${slugStatusText[slugStatus].color}`}>
              {slugStatusText[slugStatus].text}
            </p>
          )}
          {errors.slug && (
            <p className="mt-1 text-sm text-red-500">{errors.slug.message}</p>
          )}
        </div>

        {saveError && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {saveError}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || slugStatus === 'taken' || slugStatus === 'checking'}
          className="mt-2 flex min-h-[52px] items-center justify-center rounded-2xl bg-[#854F0B] font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {saving ? 'Сохраняю...' : 'Создать витрину'}
        </button>
      </form>
    </div>
  )
}
