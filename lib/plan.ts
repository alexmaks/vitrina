// Тарифы: free (ограниченный) и pro (по подписке).
// Оплаты пока нет — план переключается вручную в базе (merchants.plan).
// plan_until = null → бессрочно; дата в прошлом → план считается free.

export const PRO_PRICE_LABEL = '199 ₽/мес'

export const FREE_LIMITS = {
  maxProducts: 10,
  maxPhotos: 3,
} as const

export const PRO_LIMITS = {
  maxProducts: Infinity,
  maxPhotos: 10,
} as const

export function isPlanActive(
  plan: string | null | undefined,
  planUntil: string | null | undefined,
): boolean {
  if (plan !== 'pro') return false
  if (!planUntil) return true // бессрочный Pro
  return new Date(planUntil).getTime() > Date.now()
}

// Что входит в Pro — для страницы тарифа и замков в интерфейсе
export const PRO_FEATURES = [
  'Товаров без ограничений (в бесплатном — до 10)',
  'До 10 фото на товар (в бесплатном — 3)',
  'Короткое видео в карточке товара',
  'Полная статистика: просмотры товаров, топ, клики «Написать»',
  'Свой цвет оформления витрины',
  'Своя картинка-фон витрины',
  'Распродажа со скидкой на всё',
] as const
