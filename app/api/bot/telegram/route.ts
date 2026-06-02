import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ''
// APP_DOMAIN — серверная переменная (без NEXT_PUBLIC_), читается в рантайме,
// не вшивается в бандл при сборке. Добавить в Vercel env vars.
const DOMAIN = process.env.APP_DOMAIN ?? process.env.NEXT_PUBLIC_DOMAIN
if (!DOMAIN) throw new Error('APP_DOMAIN or NEXT_PUBLIC_DOMAIN is not set')

async function sendMessage(chatId: number, text: string, replyMarkup?: object) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  })
}

export async function POST(request: Request) {
  // КРИТ-2: проверяем что запрос действительно от Telegram
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (webhookSecret) {
    const incoming = request.headers.get('x-telegram-bot-api-secret-token')
    if (incoming !== webhookSecret) {
      return NextResponse.json({ ok: false }, { status: 403 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const message = body.message as Record<string, unknown> | undefined
  if (!message) return NextResponse.json({ ok: true })

  const chatId = (message.chat as Record<string, unknown>)?.id as number
  const from = message.from as Record<string, unknown> | undefined
  const telegramId = from?.id as number | undefined
  const firstName = (from?.first_name as string) ?? 'Мастер'
  const username = from?.username as string | undefined
  const text = (message.text as string) ?? ''

  if (!telegramId || !chatId) return NextResponse.json({ ok: true })

  if (text.startsWith('/start')) {
    const supabase = createSupabaseAdminClient()

    // Upsert мастера
    const { data: merchant, error } = await supabase
      .from('merchants')
      .upsert(
        {
          telegram_id: telegramId,
          telegram_username: username ?? null,
          telegram_first_name: firstName,
          contact_telegram: username ?? String(telegramId),
        },
        { onConflict: 'telegram_id', ignoreDuplicates: false },
      )
      .select('id, slug, is_published')
      .single()

    if (error || !merchant) {
      await sendMessage(chatId, 'Ошибка авторизации. Попробуйте ещё раз.')
      return NextResponse.json({ ok: true })
    }

    // Проверяем, есть ли polling-токен в команде /start <TOKEN>
    const parts = text.trim().split(/\s+/)
    const loginToken = parts[1] ?? null

    if (loginToken) {
      // Новый flow: браузер ждёт — проставляем merchant_id в login_tokens
      const { error: updErr } = await supabase
        .from('login_tokens')
        .update({ merchant_id: merchant.id })
        .eq('token', loginToken)
        .gt('expires_at', new Date().toISOString())

      if (updErr) {
        await sendMessage(chatId, '⚠️ Ссылка устарела. Попробуйте войти заново.')
        return NextResponse.json({ ok: true })
      }

      const isNew = !merchant.slug || !merchant.is_published
      const confirmText = isNew
        ? `Привет, ${firstName}! 👋\n\nАвторизация подтверждена. Вернитесь в браузер — страница откроется автоматически.`
        : `С возвращением, ${firstName}! 👋\n\nАвторизация подтверждена. Вернитесь в браузер — страница откроется автоматически.`

      await sendMessage(chatId, confirmText)
    } else {
      // Пользователь открыл бота напрямую (без токена из браузера).
      // Не отправляем кнопку — она открывается в браузере Telegram,
      // откуда нельзя сохранить PWA. Просто объясняем где войти.
      const loginUrl = `${DOMAIN}/login`
      const welcomeText = `Привет, ${firstName}! 👋\n\nЧтобы войти, откройте страницу входа в браузере (Safari или Chrome):\n\n${loginUrl}\n\nТам нажмите «Войти через Telegram» — страница сама откроется в нужном месте.`
      await sendMessage(chatId, welcomeText)
    }
  }

  return NextResponse.json({ ok: true })
}
