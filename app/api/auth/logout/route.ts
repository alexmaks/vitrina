import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/session'

export async function POST() {
  const response = NextResponse.redirect(
    new URL('/', process.env.NEXT_PUBLIC_DOMAIN ?? 'http://localhost:3000'),
  )
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
