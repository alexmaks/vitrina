'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useMerchant } from '@/components/admin/MerchantContext'
import { useRouter } from 'next/navigation'

const schema = z.object({
  saleActive: z.boolean(),
  salePercent: z.string().optional(),
  saleUntil: z.string().optional(),
  saleText: z.string().max(80).optional(),
})

type FormValues = z.infer<typeof schema>

export default function SalePage() {
  const merchant = useMerchant()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const { register, handleSubmit, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      saleActive: merchant.sale?.isActive ?? false,
      salePercent: merchant.sale?.percent != null ? String(merchant.sale.percent) : '',
      saleUntil: merchant.sale?.until?.slice(0, 10) ?? '',
      saleText: merchant.sale?.text ?? 'Распродажа на всё',
    },
  })

  const saleActive = watch('saleActive')

  // Распродажа — Pro-фишка
  if (!merchant.isPro) {
    return (
      <div className="px-5 py-6">
        <h1 className="mb-6 text-xl font-bold text-[#1A1A1A]">Распродажа</h1>
        <div className="mt-10 text-center">
          <div className="mb-4 text-5xl">🔒</div>
          <p className="mb-2 font-semibold text-[#1A1A1A]">Распродажа — в Pro</p>
          <p className="mb-6 text-sm text-[#9A9A9A]">
            Баннер со скидкой на всю витрину и автоматический пересчёт цен.
          </p>
          <a
            href="/admin/tariff"
            className="inline-flex min-h-[48px] items-center rounded-2xl bg-[#854F0B] px-6 font-semibold text-white"
          >
            Подробнее о Pro
          </a>
        </div>
      </div>
    )
  }

  async function onSubmit(values: FormValues) {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-5 py-6">
      <h1 className="mb-6 text-xl font-bold text-[#1A1A1A]">Распродажа</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Активна */}
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[#E5E5E0] bg-white px-4 py-4">
          <div>
            <p className="font-medium text-[#1A1A1A]">Распродажа активна</p>
            <p className="text-sm text-[#9A9A9A]">
              Показывает баннер на витрине и применяет скидку
            </p>
          </div>
          <input
            {...register('saleActive')}
            type="checkbox"
            className="h-5 w-5 accent-[#854F0B]"
          />
        </label>

        {saleActive && (
          <>
            {/* Процент */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
                Скидка, %
              </label>
              <input
                {...register('salePercent')}
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                placeholder="20"
                className="w-full rounded-xl border border-[#E5E5E0] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#854F0B] focus:ring-1 focus:ring-[#854F0B]"
              />
            </div>

            {/* Дата окончания */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
                До какого числа
              </label>
              <input
                {...register('saleUntil')}
                type="date"
                className="w-full rounded-xl border border-[#E5E5E0] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#854F0B] focus:ring-1 focus:ring-[#854F0B]"
              />
            </div>

            {/* Текст баннера */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
                Текст баннера
              </label>
              <input
                {...register('saleText')}
                placeholder="Распродажа на всё"
                className="w-full rounded-xl border border-[#E5E5E0] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#854F0B] focus:ring-1 focus:ring-[#854F0B]"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex min-h-[52px] items-center justify-center rounded-2xl bg-[#854F0B] font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {saved ? '✓ Сохранено' : saving ? 'Сохраняю...' : 'Сохранить'}
        </button>
      </form>
    </div>
  )
}
