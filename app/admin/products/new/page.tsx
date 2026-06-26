import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import ProductForm from '@/components/admin/ProductForm'
import { getMerchantAdminData } from '@/lib/merchants-db'

async function createProduct(formData: FormData) {
  'use server'
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) return

  const supabase = createSupabaseAdminClient()
  const merchant = await getMerchantAdminData(session.merchantId)

  const name = formData.get('name') as string
  const price = parseInt(formData.get('price') as string, 10)
  const description = (formData.get('description') as string) || null
  const discountRaw = formData.get('discountPercent') as string
  const discountPercent = discountRaw ? parseInt(discountRaw, 10) : null
  const isAvailable = formData.get('isAvailable') === 'true'
  const imageUrlsRaw = (formData.get('imageUrls') as string) || '[]'
  const imageUrls: string[] = JSON.parse(imageUrlsRaw)
  const imageUrl = imageUrls[0] ?? null
  const videoUrl = (formData.get('videoUrl') as string) || null

  await supabase.from('products').insert({
    merchant_id: session.merchantId,
    name,
    price,
    description,
    discount_percent: discountPercent,
    is_available: isAvailable,
    image_url: imageUrl,
    image_urls: imageUrls,
    video_url: videoUrl,
    sort_order: 0,
  } as Record<string, unknown>)

  if (merchant?.slug) {
    revalidatePath(`/${merchant.slug}`)
  }
  revalidatePath('/admin/products')

  redirect('/admin/products')
}

export default async function NewProductPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) redirect('/login')

  const merchant = await getMerchantAdminData(session.merchantId)
  if (!merchant) redirect('/login')

  return (
    <div className="px-5 py-6">
      <div className="mb-6 flex items-center gap-3">
        <a href="/admin/products" className="text-[#854F0B]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <h1 className="text-xl font-bold text-[#1A1A1A]">Новый товар</h1>
      </div>

      <ProductForm
        merchantId={session.merchantId}
        merchantSlug={merchant.slug}
        action={createProduct}
      />
    </div>
  )
}
