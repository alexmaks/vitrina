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

  // iOS WebKit (Telegram in-app browser) дропает cookie на 302-редиректах.
  // Решение: возвращаем 200 с HTML + JS-редирект.
  // Cookie на 200-ответе сохраняется корректно, затем JS делает переход.
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Входим...</title>
  <style>
    body { margin: 0; display: flex; align-items: center; justify-content: center;
           min-height: 100svh; font-family: -apple-system, sans-serif;
           background: #FAFAF7; color: #1A1A1A; }
    .wrap { text-align: center; }
    .icon { width: 56px; height: 56px; border-radius: 16px; background: #854F0B;
            color: #fff; font-size: 24px; font-weight: 700; display: flex;
            align-items: center; justify-content: center; margin: 0 auto 16px; }
    p { font-size: 15px; color: #6B6B6B; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="icon">В</div>
    <p>Входим в витрину...</p>
  </div>
  <script>
    // Небольшая задержка чтобы cookie успела записаться до редиректа
    setTimeout(function() {
      window.location.replace(${JSON.stringify(redirectUrl)});
    }, 200);
  </script>
</body>
</html>`

  const response = new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return response
}
