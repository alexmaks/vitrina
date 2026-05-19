/**
 * Генерация sitemap.xml для всех витрин.
 * Запуск: node scripts/generate-sitemap.mjs
 * Вызывается автоматически через npm run build (см. package.json).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const domain = process.env.NEXT_PUBLIC_DOMAIN ?? 'https://vitrina-kappa.vercel.app'

// Читаем slug'и из имён YAML-файлов
const merchantsDir = path.join(root, 'data', 'merchants')
const slugs = fs
  .readdirSync(merchantsDir)
  .filter(f => f.endsWith('.yaml'))
  .map(f => f.replace('.yaml', ''))

const now = new Date().toISOString().split('T')[0]

const urls = [
  { loc: `${domain}/`, priority: '0.5', changefreq: 'monthly' },
  ...slugs.map(slug => ({
    loc: `${domain}/${slug}/`,
    priority: '1.0',
    changefreq: 'weekly',
  })),
]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

const outPath = path.join(root, 'public', 'sitemap.xml')
fs.writeFileSync(outPath, xml, 'utf-8')
console.log(`✓ sitemap.xml → ${urls.length} URL`)
