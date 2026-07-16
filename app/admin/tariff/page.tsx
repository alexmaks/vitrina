import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getMerchantAdminData } from '@/lib/merchants-db'
import { PRO_FEATURES, PRO_PRICE_LABEL, FREE_LIMITS } from '@/lib/plan'

export const dynamic = 'force-dynamic'

export default async function TariffPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) redirect('/login')

  const merchant = await getMerchantAdminData(session.merchantId)
  if (!merchant) redirect('/login')

  return (
    <div className="px-5 py-6">
      <div className="mb-6 flex items-center gap-3">
        <a href="/admin/settings" className="text-[#854F0B]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <h1 className="text-xl font-bold text-[#1A1A1A]">Тариф</h1>
      </div>

      {/* Текущий тариф */}
      <div
        className={`mb-5 rounded-2xl border p-4 ${
          merchant.isPro
            ? 'border-[#854F0B] bg-[#FBF7EE]'
            : 'border-[#E5E5E0] bg-white'
        }`}
      >
        <p className="text-sm text-[#9A9A9A]">Ваш тариф</p>
        <p className="text-lg font-bold text-[#1A1A1A]">
          {merchant.isPro ? 'Pro ✦' : 'Бесплатный'}
        </p>
        {merchant.isPro ? (
          <p className="mt-1 text-sm text-[#6B6B6B]">
            Все возможности открыты. Спасибо, что вы с нами!
          </p>
        ) : (
          <p className="mt-1 text-sm text-[#6B6B6B]">
            До {FREE_LIMITS.maxProducts} товаров, {FREE_LIMITS.maxPhotos} фото на товар,
            базовая статистика.
          </p>
        )}
      </div>

      {/* Что даёт Pro */}
      <div className="rounded-2xl border border-[#E5E5E0] bg-white p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="font-semibold text-[#1A1A1A]">Что даёт Pro</p>
          <p className="text-sm font-bold text-[#854F0B]">{PRO_PRICE_LABEL}</p>
        </div>
        <ul className="flex flex-col gap-2.5">
          {PRO_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-[#4A4A4A]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-[#854F0B]">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {!merchant.isPro && (
        <div className="mt-5 rounded-2xl bg-[#F5F5F0] px-4 py-4 text-center">
          <p className="text-sm font-medium text-[#1A1A1A]">
            Оплата внутри приложения появится совсем скоро
          </p>
          <p className="mt-1 text-xs text-[#9A9A9A]">
            Хотите Pro уже сейчас — напишите нам, подключим вручную.
          </p>
        </div>
      )}
    </div>
  )
}
