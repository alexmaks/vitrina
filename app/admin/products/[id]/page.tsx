import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import ProductForm from '@/components/admin/ProductForm'
import { getMerchantAdminData } from '@/lib/merchants-db'

interface PageProps {
  params: Promise<{ id: string }>
}

async function updateProduct(formData: FormData) {
  'use server'
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) return

  const supabase = createSupabaseAdminClient()
  const merchant = await getMerchantAdminData(session.merchantId)

  const productId = formData.get('productId') as string
  const name = formData.get('name') as string
  const price = parseInt(formData.get('price') as string, 10)
  const description = (formData.get('description') as string) || null
  const discountRaw = formData.get('discountPercent') as string
  const discountPercent = discountRaw ? parseInt(discountRaw, 10) : null
  const isAvailable = formData.get('isAvailable') === 'true'
  const imageUrl = (formData.get('imageUrl') as string) || null

  await supabase
    .from('products')
    .update({
      name,
      price,
      description,
      discount_percent: discountPercent,
      is_available: isAvailable,
      image_url: imageUrl,
    } as Record<string, unknown>)
    .eq('id', productId)
    .eq('merchant_id', session.merchantId)

  if (merchant?.slug) {
    revalidatePath(`/${merchant.slug}`)
  }
  revalidatePath('/admin/products')

  redirect('/admin/products')
}

async function deleteProduct(productId: string, merchantSlug: string | null) {
  'use server'
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) return

  const supabase = createSupabaseAdminClient()

  // Получаем image_url для удаления из Storage
  const { data: product } = await supabase
    .from('products')
    .select('image_url')
    .eq('id', productId)
    .eq('merchant_id', session.merchantId)
    .single()

  await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('merchant_id', session.merchantId)

  // Удаляем файл из Storage если есть
  if (product?.image_url) {
    try {
      const url = new URL(product.image_url)
      const pathParts = url.pathname.split('/object/public/products/')
      if (pathParts[1]) {
        await supabase.storage.from('products').remove([pathParts[1]])
      }
    } catch {
      // Игнорируем ошибки удаления файла
    }
  }

  if (merchantSlug) {
    revalidatePath(`/${merchantSlug}`)
  }

  redirect('/admin/products')
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params

  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) redirect('/login')

  const merchant = await getMerchantAdminData(session.merchantId)
  if (!merchant) redirect('/login')

  const supabase = createSupabaseAdminClient()
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('merchant_id', session.merchantId)
    .single()

  if (!product) notFound()

  const deleteAction = deleteProduct.bind(null, id, merchant.slug)

  return (
    <div className="px-5 py-6">
      <div className="mb-6 flex items-center gap-3">
        <a href="/admin/products" className="text-[#854F0B]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <h1 className="text-xl font-bold text-[#1A1A1A]">Редактировать</h1>
      </div>

      <ProductForm
        merchantId={session.merchantId}
        merchantSlug={merchant.slug}
        productId={id}
        defaultValues={{
          name: product.name,
          price: product.price,
          description: product.description ?? '',
          discountPercent: product.discount_percent ?? '',
          isAvailable: product.is_available,
          imageUrl: product.image_url ?? '',
        }}
        action={updateProduct}
        deleteAction={deleteAction}
      />
    </div>
  )
}
