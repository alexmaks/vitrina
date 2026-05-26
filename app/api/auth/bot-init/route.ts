import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'vitrina_kappa_bot'

export async function GET() {
  // Генерируем случайный токен
  const token = Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 20)

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('login_tokens').insert({ token })

  if (error) {
    console.error('bot-init insert error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  const botUrl = `https://t.me/${BOT_USERNAME}?start=${token}`
  return NextResponse.json({ token, botUrl })
}
