import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession, SESSION_COOKIE } from './lib/session'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null

  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Передаём merchant-id дочерним обработчикам через заголовок
  const response = NextResponse.next()
  response.headers.set('x-merchant-id', session.merchantId)
  response.headers.set('x-merchant-slug', session.slug ?? '')
  return response
}

export const config = {
  matcher: ['/admin/:path*', '/api/revalidate'],
}
