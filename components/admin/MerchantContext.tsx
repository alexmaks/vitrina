'use client'

import { createContext, useContext } from 'react'
import type { MerchantAdmin } from '@/lib/merchants-db'

export const MerchantContext = createContext<MerchantAdmin | null>(null)

export function useMerchant(): MerchantAdmin {
  const ctx = useContext(MerchantContext)
  if (!ctx) throw new Error('useMerchant must be used inside MerchantProvider')
  return ctx
}

export function MerchantProvider({
  merchant,
  children,
}: {
  merchant: MerchantAdmin
  children: React.ReactNode
}) {
  return (
    <MerchantContext.Provider value={merchant}>
      {children}
    </MerchantContext.Provider>
  )
}
