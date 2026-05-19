import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getMerchantAdminData } from '@/lib/merchants-db'
import { MerchantProvider } from '@/components/admin/MerchantContext'
import BottomNav from '@/components/admin/BottomNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null

  if (!session) {
    redirect('/login')
  }

  const merchant = await getMerchantAdminData(session.merchantId)
  if (!merchant) {
    redirect('/login')
  }

  return (
    <MerchantProvider merchant={merchant}>
      <div className="mx-auto min-h-svh max-w-md bg-[#FAFAF7] pb-20">
        {children}
      </div>
      <BottomNav />
    </MerchantProvider>
  )
}
