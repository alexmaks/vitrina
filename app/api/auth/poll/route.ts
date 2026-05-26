import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ ready: false, error: 'no_token' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('login_tokens')
    .select('merchant_id, expires_at')
    .eq('token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ ready: false, error: 'not_found' })
  }

  // Проверяем срок действия
  if (new Date(data.expires_at) < new Date()) {
    // Удаляем истёкший токен
    await supabase.from('login_tokens').delete().eq('token', token)
    return NextResponse.json({ ready: false, error: 'expired' })
  }

  if (!data.merchant_id) {
    return NextResponse.json({ ready: false })
  }

  return NextResponse.json({ ready: true })
}
