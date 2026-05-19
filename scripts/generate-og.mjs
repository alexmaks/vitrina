/**
 * Генерация OG-изображений 1200×630 для каждого мастера.
 * Запуск: node scripts/generate-og.mjs
 */
import { createCanvas, loadImage } from '@napi-rs/canvas'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const merchants = [
  {
    slug: 'baba-zina',
    name: 'Носки от бабы Зины',
    tagline: 'Ручная вязка, г. Пермь',
    accentColor: '#854F0B',
    bgColor: '#FFF8F0',
    avatar: path.join(root, 'public/avatars/baba-zina.jpg'),
  },
  {
    slug: 'cake-anna',
    name: 'Тортики Анны',
    tagline: 'Домашняя выпечка на заказ, г. Москва',
    accentColor: '#7C3A62',
    bgColor: '#FFF0F8',
    avatar: path.join(root, 'public/avatars/cake-anna.jpg'),
  },
  {
    slug: 'flowers-lena',
    name: 'Букеты от Лены',
    tagline: 'Авторская флористика, г. Санкт-Петербург',
    accentColor: '#2D6A4F',
    bgColor: '#F0FFF4',
    avatar: path.join(root, 'public/avatars/flowers-lena.jpg'),
  },
]

const OG_W = 1200
const OG_H = 630

function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

for (const m of merchants) {
  const canvas = createCanvas(OG_W, OG_H)
  const ctx = canvas.getContext('2d')

  // Фон
  ctx.fillStyle = m.bgColor
  ctx.fillRect(0, 0, OG_W, OG_H)

  // Декоративный круг (акцент) в правом верхнем углу
  ctx.beginPath()
  ctx.arc(OG_W + 80, -80, 420, 0, Math.PI * 2)
  ctx.fillStyle = hexToRgba(m.accentColor, 0.12)
  ctx.fill()

  // Ещё один круг снизу слева
  ctx.beginPath()
  ctx.arc(-80, OG_H + 80, 300, 0, Math.PI * 2)
  ctx.fillStyle = hexToRgba(m.accentColor, 0.08)
  ctx.fill()

  // Логотип проекта (маленький текст)
  ctx.font = '28px -apple-system, Arial, sans-serif'
  ctx.fillStyle = hexToRgba(m.accentColor, 0.5)
  ctx.fillText('Витрина-в-кармане', 80, OG_H - 56)

  // Аватар мастера (круглый, слева)
  if (fs.existsSync(m.avatar)) {
    try {
      const img = await loadImage(m.avatar)
      const avatarSize = 160
      const avatarX = 80
      const avatarY = (OG_H - avatarSize) / 2

      // Круглая маска
      ctx.save()
      ctx.beginPath()
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize)
      ctx.restore()

      // Тонкая окантовка аватара
      ctx.beginPath()
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2)
      ctx.strokeStyle = hexToRgba(m.accentColor, 0.3)
      ctx.lineWidth = 4
      ctx.stroke()
    } catch {
      // Если аватар не загрузился — продолжаем без него
    }
  }

  // Имя мастера
  ctx.font = 'bold 72px -apple-system, Arial, sans-serif'
  ctx.fillStyle = '#1A1A1A'
  ctx.fillText(m.name, 280, OG_H / 2 - 20)

  // Подпись
  ctx.font = '40px -apple-system, Arial, sans-serif'
  ctx.fillStyle = '#6B6B6B'
  ctx.fillText(m.tagline, 280, OG_H / 2 + 50)

  // Сохраняем
  const outPath = path.join(root, 'public/og', `${m.slug}.jpg`)
  const buffer = canvas.toBuffer('image/jpeg', 85)
  fs.writeFileSync(outPath, buffer)
  console.log(`✓ ${m.slug}.jpg`)
}

console.log('OG images generated!')
