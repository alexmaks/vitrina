import { NextResponse } from 'next/server'
import { verifyMagicToken } from '@/lib/magic-link'
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=no_token', request.url))
  }

  const payload = await verifyMagicToken(token)
  if (!payload) {
    return NextResponse.redirect(new URL('/login?error=expired', request.url))
  }

  const isNew = !payload.slug
  const redirectUrl = isNew ? '/admin/setup' : '/admin/products'

  const sessionToken = await signSession({
    merchantId: payload.merchantId,
    telegramId: payload.telegramId,
    slug: payload.slug,
  })

  // APP_DOMAIN читается в рантайме (не вшивается при сборке)
  const domain = process.env.APP_DOMAIN ?? process.env.NEXT_PUBLIC_DOMAIN ?? ''
  const response = NextResponse.redirect(
    new URL(redirectUrl, domain || request.url),
  )
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return response
}
