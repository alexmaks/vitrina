'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const schema = z.object({
  name: z.string().min(1, 'Введите название').max(120),
  price: z.string().min(1, 'Введите цену'),
  description: z.string().max(500).optional(),
  discountPercent: z.string().optional(),
  isAvailable: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface ProductFormProps {
  merchantId: string
  merchantSlug: string
  productId?: string
  defaultValues?: {
    name?: string
    price?: number | string
    description?: string
    discountPercent?: number | string
    isAvailable?: boolean
    imageUrl?: string
  }
  action: (formData: FormData) => Promise<void>
  deleteAction?: () => Promise<void>
}

export default function ProductForm({
  merchantId,
  productId,
  defaultValues,
  action,
  deleteAction,
}: ProductFormProps) {
  const router = useRouter()
  const [imagePreview, setImagePreview] = useState<string>(
    defaultValues?.imageUrl ?? '',
  )
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      price: defaultValues?.price != null ? String(defaultValues.price) : '',
      description: defaultValues?.description ?? '',
      discountPercent: defaultValues?.discountPercent != null ? String(defaultValues.discountPercent) : '',
      isAvailable: defaultValues?.isAvailable ?? true,
    },
  })

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError('')
    setUploading(true)

    // Превью сразу
    const objectUrl = URL.createObjectURL(file)
    setImagePreview(objectUrl)

    // Загружаем на сервер
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', 'product')
    fd.append('productId', productId ?? 'new')

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json()
        setUploadError(err.error ?? 'Ошибка загрузки')
        setImagePreview(defaultValues?.imageUrl ?? '')
      } else {
        const { url } = await res.json()
        setImagePreview(url)
      }
    } catch {
      setUploadError('Не удалось загрузить изображение')
      setImagePreview(defaultValues?.imageUrl ?? '')
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit(values: FormValues) {
    setSaving(true)
    const fd = new FormData()
    fd.append('name', values.name)
    fd.append('price', String(values.price))
    fd.append('description', values.description ?? '')
    fd.append(
      'discountPercent',
      values.discountPercent ? String(values.discountPercent) : '',
    )
    fd.append('isAvailable', values.isAvailable ? 'true' : 'false')
    fd.append('imageUrl', imagePreview)
    fd.append('merchantId', merchantId)
    if (productId) fd.append('productId', productId)

    try {
      await action(fd)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteAction) return
    if (!confirm('Удалить товар?')) return
    setDeleting(true)
    try {
      await deleteAction()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Изображение */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
          Фото товара
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative flex h-40 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#E5E5E0] bg-[#F5F5F0] transition-colors hover:border-[#854F0B]"
        >
          {imagePreview ? (
            <Image
              src={imagePreview}
              alt="Превью"
              fill
              className="object-cover"
              unoptimized={imagePreview.startsWith('blob:')}
            />
          ) : (
            <div className="text-center text-[#9A9A9A]">
              <svg
                width="32" height="32" viewBox="0 0 24 24" fill="none"
                className="mx-auto mb-1"
              >
                <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                <path d="m21 15-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-sm">Нажмите, чтобы добавить фото</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={handleImageChange}
        />
        {uploadError && (
          <p className="mt-1 text-sm text-red-500">{uploadError}</p>
        )}
      </div>

      {/* Название */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
          Название <span className="text-red-500">*</span>
        </label>
        <input
          {...register('name')}
          placeholder="Например: Носки с оленями"
          className="w-full rounded-xl border border-[#E5E5E0] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#854F0B] focus:ring-1 focus:ring-[#854F0B]"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* Цена */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
          Цена, ₽ <span className="text-red-500">*</span>
        </label>
        <input
          {...register('price')}
          type="number"
          inputMode="numeric"
          placeholder="450"
          className="w-full rounded-xl border border-[#E5E5E0] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#854F0B] focus:ring-1 focus:ring-[#854F0B]"
        />
        {errors.price && (
          <p className="mt-1 text-sm text-red-500">{errors.price.message}</p>
        )}
      </div>

      {/* Описание */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
          Описание
        </label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Расскажите о товаре..."
          className="w-full resize-none rounded-xl border border-[#E5E5E0] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#854F0B] focus:ring-1 focus:ring-[#854F0B]"
        />
      </div>

      {/* Скидка */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
          Скидка на товар, %
        </label>
        <input
          {...register('discountPercent')}
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          placeholder="0 — без скидки"
          className="w-full rounded-xl border border-[#E5E5E0] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#854F0B] focus:ring-1 focus:ring-[#854F0B]"
        />
      </div>

      {/* В наличии */}
      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[#E5E5E0] bg-white px-4 py-3">
        <span className="text-[15px] font-medium text-[#1A1A1A]">В наличии</span>
        <input
          {...register('isAvailable')}
          type="checkbox"
          className="h-5 w-5 accent-[#854F0B]"
        />
      </label>

      {/* Кнопки */}
      <button
        type="submit"
        disabled={saving || uploading}
        className="flex min-h-[52px] items-center justify-center rounded-2xl bg-[#854F0B] font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {saving ? 'Сохраняю...' : 'Сохранить'}
      </button>

      {deleteAction && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex min-h-[52px] items-center justify-center rounded-2xl border border-red-200 font-semibold text-red-500 transition-opacity disabled:opacity-60"
        >
          {deleting ? 'Удаляю...' : 'Удалить товар'}
        </button>
      )}

      <button
        type="button"
        onClick={() => router.back()}
        className="pb-2 text-center text-sm text-[#9A9A9A]"
      >
        Отмена
      </button>
    </form>
  )
}
