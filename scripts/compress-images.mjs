/**
 * Сжимаем все картинки товаров и аватары в WebP.
 * Максимальная ширина: 800px для товаров, 200px для аватаров.
 * Качество: 78 (WebP).
 * Запуск: node scripts/compress-images.mjs
 */
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')

const jobs = [
  // Товары: 800px, q78
  { dir: 'products/baba-zina',   maxWidth: 800, quality: 78 },
  { dir: 'products/cake-anna',   maxWidth: 800, quality: 78 },
  { dir: 'products/flowers-lena', maxWidth: 800, quality: 78 },
  // Аватары: 200px, q85
  { dir: 'avatars',              maxWidth: 200, quality: 85 },
]

let converted = 0
let savedBytes = 0

for (const job of jobs) {
  const dir = path.join(publicDir, job.dir)
  const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png)$/i.test(f))

  for (const file of files) {
    const srcPath = path.join(dir, file)
    const baseName = file.replace(/\.(jpg|jpeg|png)$/i, '')
    const outPath = path.join(dir, baseName + '.webp')

    // Пропускаем если WebP уже актуальнее исходника
    if (
      fs.existsSync(outPath) &&
      fs.statSync(outPath).mtimeMs > fs.statSync(srcPath).mtimeMs
    ) {
      console.log(`  skip ${job.dir}/${baseName}.webp (актуально)`)
      continue
    }

    const srcSize = fs.statSync(srcPath).size

    await sharp(srcPath)
      .resize({ width: job.maxWidth, withoutEnlargement: true })
      .webp({ quality: job.quality })
      .toFile(outPath)

    const outSize = fs.statSync(outPath).size
    const saved = srcSize - outSize
    savedBytes += saved
    converted++

    console.log(
      `  ✓ ${job.dir}/${baseName}.webp  ${(srcSize/1024).toFixed(0)}KB → ${(outSize/1024).toFixed(0)}KB  (−${(saved/1024).toFixed(0)}KB)`
    )
  }
}

console.log(`\nГотово: ${converted} файлов, сэкономлено ${(savedBytes/1024).toFixed(0)} KB`)
