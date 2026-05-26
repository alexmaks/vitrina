import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=no_token', request.url))
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('login_tokens')
    .select('merchant_id, expires_at')
    .eq('token', token)
    .single()

  if (error || !data || !data.merchant_id) {
    return NextResponse.redirect(new URL('/login?error=expired', request.url))
  }

  if (new Date(data.expires_at) < new Date()) {
    await supabase.from('login_tokens').delete().eq('token', token)
    return NextResponse.redirect(new URL('/login?error=expired', request.url))
  }

  // Получаем данные мастера
  const { data: merchant, error: mErr } = await supabase
    .from('merchants')
    .select('id, slug, telegram_id')
    .eq('id', data.merchant_id)
    .single()

  if (mErr || !merchant) {
    return NextResponse.redirect(new URL('/login?error=not_found', request.url))
  }

  // Удаляем токен (одноразовый)
  await supabase.from('login_tokens').delete().eq('token', token)

  const isNew = !merchant.slug
  const redirectUrl = isNew ? '/admin/setup' : '/admin/products'

  const sessionToken = await signSession({
    merchantId: merchant.id,
    telegramId: merchant.telegram_id,
    slug: merchant.slug ?? null,
  })

  // Показываем HTML-страницу с кнопкой (iOS WebKit теряет cookie при 302)
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Витрина в кармане</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { display: flex; align-items: center; justify-content: center;
           min-height: 100svh; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
           background: #FAFAF7; padding: 24px; }
    .card { text-align: center; width: 100%; max-width: 320px; }
    .icon { width: 72px; height: 72px; border-radius: 20px; background: #854F0B;
            color: #fff; font-size: 32px; font-weight: 700;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 20px; }
    h1 { font-size: 22px; font-weight: 700; color: #1A1A1A; margin-bottom: 8px; }
    p  { font-size: 15px; color: #6B6B6B; margin-bottom: 28px; line-height: 1.5; }
    a  { display: flex; align-items: center; justify-content: center;
         min-height: 52px; border-radius: 16px; background: #854F0B;
         color: #fff; font-size: 16px; font-weight: 600;
         text-decoration: none; width: 100%; }
    a:active { opacity: 0.8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">В</div>
    <h1>Вы вошли!</h1>
    <p>Нажмите кнопку, чтобы открыть свою витрину</p>
    <a href="${redirectUrl}" id="btn">Открыть витрину →</a>
  </div>
  <script>
    setTimeout(function() {
      try { window.location.replace(${JSON.stringify(redirectUrl)}); } catch(e) {}
    }, 500);
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
