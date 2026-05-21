import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { signMagicToken } from '@/lib/magic-link'

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
    // Upsert мастера
    const supabase = createSupabaseAdminClient()
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

    // Создаём подписанную ссылку (действует 10 минут)
    const token = await signMagicToken({
      merchantId: merchant.id,
      telegramId,
      slug: merchant.slug ?? null,
    })

    const isNew = !merchant.slug || !merchant.is_published
    const magicUrl = `${DOMAIN}/api/auth/magic?token=${token}`

    const welcomeText = isNew
      ? `Привет, ${firstName}! 👋\n\nНажмите кнопку ниже, чтобы создать свою витрину.`
      : `С возвращением, ${firstName}! 👋\n\nНажмите кнопку, чтобы войти в витрину.`

    await sendMessage(chatId, welcomeText, {
      inline_keyboard: [[{ text: '🚀 Войти в витрину', url: magicUrl }]],
    })
  }

  return NextResponse.json({ ok: true })
}
