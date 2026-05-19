// Генерирует PWA иконки: icon-192.png, icon-512.png, icon-maskable.png
// Запуск: node scripts/generate-icons.mjs
import { createCanvas } from '@napi-rs/canvas'
import fs from 'fs'
import path from 'path'

const OUTPUT_DIR = path.join(process.cwd(), 'public')

const BG_COLOR = '#854F0B'
const TEXT_COLOR = '#FFFFFF'
const LETTER = 'В'

function generateIcon(size, maskable = false) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  if (maskable) {
    // Maskable: цветной фон на весь холст
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, size, size)
  } else {
    // Обычная: скруглённый прямоугольник
    const radius = size * 0.22
    ctx.fillStyle = BG_COLOR
    ctx.beginPath()
    ctx.moveTo(radius, 0)
    ctx.lineTo(size - radius, 0)
    ctx.quadraticCurveTo(size, 0, size, radius)
    ctx.lineTo(size, size - radius)
    ctx.quadraticCurveTo(size, size, size - radius, size)
    ctx.lineTo(radius, size)
    ctx.quadraticCurveTo(0, size, 0, size - radius)
    ctx.lineTo(0, radius)
    ctx.quadraticCurveTo(0, 0, radius, 0)
    ctx.closePath()
    ctx.fill()
  }

  // Буква
  const fontSize = maskable ? size * 0.4 : size * 0.5
  ctx.fillStyle = TEXT_COLOR
  ctx.font = `bold ${fontSize}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(LETTER, size / 2, size / 2)

  return canvas.toBuffer('image/png')
}

// 192×192
fs.writeFileSync(path.join(OUTPUT_DIR, 'icon-192.png'), generateIcon(192))
console.log('✓ icon-192.png')

// 512×512
fs.writeFileSync(path.join(OUTPUT_DIR, 'icon-512.png'), generateIcon(512))
console.log('✓ icon-512.png')

// 512×512 maskable
fs.writeFileSync(path.join(OUTPUT_DIR, 'icon-maskable.png'), generateIcon(512, true))
console.log('✓ icon-maskable.png')

console.log('Done!')
