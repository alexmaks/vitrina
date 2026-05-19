// Миграция демо-данных из YAML → Supabase
// Запуск: node scripts/migrate-yaml.mjs
//
// Требует .env.local с NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY

import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

// Загружаем .env.local вручную
const envPath = path.join(ROOT, '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    process.env[key] = value
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DATA_DIR = path.join(ROOT, 'data', 'merchants')
const PUBLIC_DIR = path.join(ROOT, 'public')

// Фиктивные telegram_id для демо-мастеров (чтобы не конфликтовали с реальными)
const DEMO_TELEGRAM_IDS = {
  'baba-zina': 100000001,
  'cake-anna': 100000002,
  'flowers-lena': 100000003,
}

async function uploadLocalImage(localPath, bucket, storagePath) {
  if (!fs.existsSync(localPath)) {
    console.log(`  Файл не найден: ${localPath}`)
    return null
  }

  const buffer = fs.readFileSync(localPath)
  const contentType = localPath.endsWith('.webp')
    ? 'image/webp'
    : localPath.endsWith('.png')
    ? 'image/png'
    : 'image/jpeg'

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, { contentType, upsert: true })

  if (error) {
    console.log(`  Ошибка загрузки ${storagePath}: ${error.message}`)
    return null
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath)
  return data.publicUrl
}

async function migrateMerchant(yamlFile) {
  const slug = yamlFile.replace('.yaml', '')
  const filePath = path.join(DATA_DIR, yamlFile)
  const raw = yaml.load(fs.readFileSync(filePath, 'utf-8'))

  console.log(`\nМигрируем: ${slug} (${raw.name})`)

  // Загружаем аватар
  let avatarUrl = null
  if (raw.avatar) {
    const localAvatar = path.join(PUBLIC_DIR, raw.avatar.replace(/^\//, ''))
    avatarUrl = await uploadLocalImage(localAvatar, 'avatars', `${slug}.webp`)
    console.log(`  Аватар: ${avatarUrl ? '✓' : '✗'}`)
  }

  // Создаём/обновляем мастера
  const telegramId = DEMO_TELEGRAM_IDS[slug] ?? (100000000 + Math.floor(Math.random() * 1000))
  const { data: merchant, error: merchantError } = await supabase
    .from('merchants')
    .upsert(
      {
        telegram_id: telegramId,
        telegram_username: raw.telegram,
        telegram_first_name: raw.name,
        slug: raw.slug,
        name: raw.name,
        tagline: raw.tagline,
        avatar_url: avatarUrl,
        accent_color: raw.accentColor ?? '#854F0B',
        sale_percent: raw.sale?.percent ?? null,
        sale_until: raw.sale?.until ? new Date(raw.sale.until).toISOString() : null,
        sale_text: raw.sale?.text ?? null,
        contact_telegram: raw.telegram,
        is_published: true,
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single()

  if (merchantError) {
    console.error(`  Ошибка мастера: ${merchantError.message}`)
    return
  }

  console.log(`  Мастер: ✓ (id: ${merchant.id})`)

  // Удаляем старые товары
  await supabase.from('products').delete().eq('merchant_id', merchant.id)

  // Создаём товары
  for (let i = 0; i < raw.products.length; i++) {
    const p = raw.products[i]

    // Загружаем изображение товара
    let imageUrl = null
    if (p.image) {
      const localImg = path.join(PUBLIC_DIR, p.image.replace(/^\//, ''))
      imageUrl = await uploadLocalImage(localImg, 'products', `${merchant.id}/${i}.webp`)
    }

    const { error: productError } = await supabase.from('products').insert({
      merchant_id: merchant.id,
      name: p.name,
      price: p.price,
      image_url: imageUrl,
      discount_percent: p.discount ?? null,
      is_available: true,
      sort_order: i,
    })

    if (productError) {
      console.log(`  Товар "${p.name}": ✗ (${productError.message})`)
    } else {
      console.log(`  Товар "${p.name}": ✓`)
    }
  }
}

async function main() {
  console.log('Начинаем миграцию YAML → Supabase...\n')

  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Директория ${DATA_DIR} не найдена`)
    process.exit(1)
  }

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.yaml'))
  console.log(`Найдено файлов: ${files.length}`)

  for (const file of files) {
    await migrateMerchant(file)
  }

  console.log('\n✓ Миграция завершена')
}

main().catch((err) => {
  console.error('Ошибка миграции:', err)
  process.exit(1)
})
