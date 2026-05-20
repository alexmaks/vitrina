// Session management using Web Crypto API (works in Edge Runtime + Node.js)

export interface SessionPayload {
  merchantId: string
  telegramId: number
  slug: string | null
  iat: number
}

const encoder = new TextEncoder()

function getSecret(): string {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET is not set')
  return s
}

async function getKey(secret: string): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function toBase64url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function fromBase64url(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Подписываем payload → "base64url.hmac"
export async function signSession(
  payload: Omit<SessionPayload, 'iat'>,
): Promise<string> {
  const data: SessionPayload = { ...payload, iat: Date.now() }
  // encodeURIComponent + unescape — безопасный btoa для Unicode (кириллица в slug)
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  const key = await getKey(getSecret())
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(encoded))
  return `${encoded}.${toBase64url(sig)}`
}

// Проверяем подпись → возвращаем payload или null
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const dotIndex = token.lastIndexOf('.')
    if (dotIndex === -1) return null
    const encoded = token.slice(0, dotIndex)
    const sig = token.slice(dotIndex + 1)
    const key = await getKey(getSecret())
    const valid = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64url(sig),
      encoder.encode(encoded),
    )
    if (!valid) return null
    const json = decodeURIComponent(escape(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))))
    const payload = JSON.parse(json) as SessionPayload
    return payload
  } catch {
    return null
  }
}

export const SESSION_COOKIE = 'vitrina_session'
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 дней в секундах
