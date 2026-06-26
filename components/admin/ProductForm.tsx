'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const MAX_PHOTOS = 10

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
    imageUrls?: string[]
    imageUrl?: string  // legacy single-photo fallback
    videoUrl?: string  // короткое видео (опционально)
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

  // Инициализируем массив фото (учитываем legacy imageUrl)
  const initialImages: string[] = (() => {
    if (defaultValues?.imageUrls?.length) return defaultValues.imageUrls
    if (defaultValues?.imageUrl) return [defaultValues.imageUrl]
    return []
  })()

  const [images, setImages] = useState<string[]>(initialImages)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [video, setVideo] = useState<string>(defaultValues?.videoUrl ?? '')
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [videoError, setVideoError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  // Стабильный base ID для загрузок нового товара
  const baseId = useRef<string>(productId ?? crypto.randomUUID())

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
      discountPercent: defaultValues?.discountPercent != null
        ? String(defaultValues.discountPercent)
        : '',
      isAvailable: defaultValues?.isAvailable ?? true,
    },
  })

  // Индекс слота, в который идёт загрузка (null = добавление нового)
  const pendingSlotRef = useRef<number | null>(null)

  function openPickerForSlot(slotIndex: number | null) {
    pendingSlotRef.current = slotIndex
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''  // сбрасываем, чтобы можно было выбрать тот же файл

    const slot = pendingSlotRef.current
    const slotIndex = slot !== null ? slot : images.length
    setUploadingIndex(slotIndex)
    setUploadError('')

    // Оптимистичное превью
    const blobUrl = URL.createObjectURL(file)
    setImages((prev) => {
      const next = [...prev]
      next[slotIndex] = blobUrl
      return next
    })

    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', 'product')
    fd.append('productId', `${baseId.current}_${slotIndex}`)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json()
        setUploadError(err.error ?? 'Ошибка загрузки')
        // откатываем слот
        setImages((prev) => {
          const next = [...prev]
          next.splice(slotIndex, 1)
          return next
        })
      } else {
        const { url } = await res.json()
        setImages((prev) => {
          const next = [...prev]
          next[slotIndex] = url
          return next
        })
      }
    } catch {
      setUploadError('Не удалось загрузить изображение')
      setImages((prev) => {
        const next = [...prev]
        next.splice(slotIndex, 1)
        return next
      })
    } finally {
      setUploadingIndex(null)
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadingVideo(true)
    setVideoError('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', 'video')
    fd.append('productId', `${baseId.current}_video`)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setVideoError(err.error ?? 'Не удалось загрузить видео')
      } else {
        const { url } = await res.json()
        setVideo(url)
      }
    } catch {
      setVideoError('Не удалось загрузить видео')
    } finally {
      setUploadingVideo(false)
    }
  }

  function removeVideo() {
    setVideo('')
    setVideoError('')
  }

  async function onSubmit(values: FormValues) {
    setSaving(true)
    const fd = new FormData()
    fd.append('name', values.name)
    fd.append('price', String(values.price))
    fd.append('description', values.description ?? '')
    fd.append('discountPercent', values.discountPercent ? String(values.discountPercent) : '')
    fd.append('isAvailable', values.isAvailable ? 'true' : 'false')
    fd.append('imageUrls', JSON.stringify(images.filter(Boolean)))
    fd.append('videoUrl', video)
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

  const isUploading = uploadingIndex !== null

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

      {/* ── Фото (до 10) ─────────────────────────────── */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <label className="text-sm font-medium text-[#1A1A1A]">
            Фото товара
          </label>
          <span className="text-xs text-[#9A9A9A]">
            {images.length} / {MAX_PHOTOS}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {/* Заполненные слоты */}
          {images.map((url, i) => (
            <div
              key={i}
              className="relative shrink-0 h-[88px] w-[88px] overflow-hidden rounded-xl border border-[#E5E5E0] bg-[#F5F5F0]"
            >
              <Image
                src={url}
                alt={`Фото ${i + 1}`}
                fill
                className="object-cover"
                unoptimized={url.startsWith('blob:')}
              />
              {/* Спиннер во время загрузки */}
              {uploadingIndex === i && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
              {/* Метка «Обложка» для первого */}
              {i === 0 && uploadingIndex !== 0 && (
                <span className="absolute bottom-0 left-0 right-0 bg-black/50 py-0.5 text-center text-[10px] font-semibold text-white">
                  Обложка
                </span>
              )}
              {/* Кнопка удалить */}
              {uploadingIndex !== i && (
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                  aria-label="Удалить фото"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              )}
            </div>
          ))}

          {/* Слот «добавить» — если не достигнут лимит */}
          {images.length < MAX_PHOTOS && uploadingIndex === null && (
            <button
              type="button"
              onClick={() => openPickerForSlot(null)}
              className="flex shrink-0 h-[88px] w-[88px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#D0CFC8] bg-[#F5F5F0] text-[#9A9A9A] transition-colors hover:border-[#854F0B] hover:text-[#854F0B]"
              aria-label="Добавить фото"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
              </svg>
              <span className="text-[10px] font-medium">Добавить</span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {uploadError && (
          <p className="mt-1 text-sm text-red-500">{uploadError}</p>
        )}
        {images.length === 0 && (
          <p className="mt-1 text-xs text-[#9A9A9A]">Первое фото станет обложкой в каталоге</p>
        )}
      </div>

      {/* ── Видео (необязательно) ────────────────────── */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
          Видео <span className="font-normal text-[#9A9A9A]">— необязательно</span>
        </label>

        {video ? (
          <div className="relative h-[160px] w-[120px] overflow-hidden rounded-xl border border-[#E5E5E0] bg-black">
            <video
              src={video}
              className="h-full w-full object-cover"
              controls
              muted
              playsInline
              preload="metadata"
            />
            <button
              type="button"
              onClick={removeVideo}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
              aria-label="Удалить видео"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={uploadingVideo}
            className="flex h-[160px] w-[120px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#D0CFC8] bg-[#F5F5F0] text-[#9A9A9A] transition-colors hover:border-[#854F0B] hover:text-[#854F0B] disabled:opacity-60"
            aria-label="Добавить видео"
          >
            {uploadingVideo ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#854F0B] border-t-transparent" />
            ) : (
              <>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 6h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-[11px] font-medium">Добавить видео</span>
              </>
            )}
          </button>
        )}

        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={handleVideoChange}
        />

        {videoError && <p className="mt-1 text-sm text-red-500">{videoError}</p>}
        <p className="mt-1 text-xs text-[#9A9A9A]">
          Короткое видео до 15 сек (макс. 15 МБ). Лучше формат MP4.
        </p>
      </div>

      {/* ── Название ─────────────────────────────────── */}
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

      {/* ── Цена ─────────────────────────────────────── */}
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

      {/* ── Описание ─────────────────────────────────── */}
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

      {/* ── Скидка ───────────────────────────────────── */}
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

      {/* ── В наличии ────────────────────────────────── */}
      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[#E5E5E0] bg-white px-4 py-3">
        <span className="text-[15px] font-medium text-[#1A1A1A]">В наличии</span>
        <input
          {...register('isAvailable')}
          type="checkbox"
          className="h-5 w-5 accent-[#854F0B]"
        />
      </label>

      {/* ── Кнопки ───────────────────────────────────── */}
      <button
        type="submit"
        disabled={saving || isUploading || uploadingVideo}
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
