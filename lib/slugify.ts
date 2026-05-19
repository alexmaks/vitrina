const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo',
  ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

export const RESERVED_SLUGS = [
  'admin', 'api', 'login', 'logout', 'signup', 'auth',
  'static', '_next', 'privacy', 'og', 'sitemap', 'robots',
  'favicon', 'manifest', 'sw', 'icon',
]

// Кириллица + латиница → kebab-case slug до 40 символов
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .split('')
    .map((c) => CYRILLIC_MAP[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

// Валидный slug: только буквы, цифры и дефис, 3–40 символов, не начинается/не кончается на дефис
export function isSlugValid(slug: string): boolean {
  return (
    /^[a-z0-9-]{3,40}$/.test(slug) &&
    !slug.startsWith('-') &&
    !slug.endsWith('-')
  )
}
