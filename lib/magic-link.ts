// Подписанный magic-link токен для входа через бота (без БД)

export interface MagicPayload {
  merchantId: string
  telegramId: number
  slug: string | null
  exp: number // Unix ms
}

const encoder = new TextEncoder()

function getSecret() {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET is not set')
  return s
}

export async function signMagicToken(
  payload: Omit<MagicPayload, 'exp'>,
): Promise<string> {
  const data: MagicPayload = {
    ...payload,
    exp: Date.now() + 10 * 60 * 1000, // 10 минут
  }
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(encoded))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  return `${encoded}.${sigB64}`
}

export async function verifyMagicToken(token: string): Promise<MagicPayload | null> {
  try {
    const dotIndex = token.lastIndexOf('.')
    if (dotIndex === -1) return null
    const encoded = token.slice(0, dotIndex)
    const sig = token.slice(dotIndex + 1)

    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      encoder.encode(getSecret()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const sigBytes = Uint8Array.from(
      atob(sig.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    )
    const valid = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(encoded),
    )
    if (!valid) return null

    const json = decodeURIComponent(escape(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))))
    const payload = JSON.parse(json) as MagicPayload
    if (Date.now() > payload.exp) return null // просрочен

    return payload
  } catch {
    return null
  }
}
