import Link from 'next/link'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getMerchantAdminData } from '@/lib/merchants-db'
import { redirect } from 'next/navigation'
import Image from 'next/image'

export default async function ProductsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) redirect('/login')

  const merchant = await getMerchantAdminData(session.merchantId)
  if (!merchant) redirect('/login')

  const products = merchant.products

  return (
    <div className="px-5 py-6">
      {/* Заголовок */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A1A1A]">Товары</h1>
          {merchant.slug && (
            <a
              href={`/${merchant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#854F0B] underline underline-offset-2"
            >
              Открыть витрину ↗
            </a>
          )}
        </div>
        <Link
          href="/admin/products/new"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#854F0B] text-2xl font-light text-white shadow-md transition-transform active:scale-95"
          aria-label="Добавить товар"
        >
          +
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="mt-16 text-center">
          <div className="mb-4 text-5xl">🛍️</div>
          <p className="mb-2 font-semibold text-[#1A1A1A]">Товаров пока нет</p>
          <p className="mb-6 text-sm text-[#9A9A9A]">
            Добавьте первый товар, нажав «+»
          </p>
          <Link
            href="/admin/products/new"
            className="inline-flex min-h-[48px] items-center rounded-2xl bg-[#854F0B] px-6 font-semibold text-white"
          >
            Добавить товар
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/admin/products/${product.id}`}
              className="flex items-center gap-3 rounded-2xl border border-[#E5E5E0] bg-white p-3 transition-colors active:bg-[#F5F5F0]"
            >
              {/* Фото */}
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F5F5F0]">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl text-[#C8C8C0]">
                    📦
                  </div>
                )}
              </div>

              {/* Информация */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[#1A1A1A]">
                  {product.name}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#1A1A1A]">
                    {product.price.toLocaleString('ru-RU')} ₽
                  </span>
                  {product.discountPercent && (
                    <span className="rounded-full bg-[#FFF3E0] px-2 py-0.5 text-xs font-semibold text-[#854F0B]">
                      −{product.discountPercent}%
                    </span>
                  )}
                </div>
              </div>

              {/* Стрелка */}
              <svg
                width="16" height="16" viewBox="0 0 16 16" fill="none"
                className="shrink-0 text-[#C8C8C0]"
              >
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
