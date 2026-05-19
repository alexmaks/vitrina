// Все строки пользовательского интерфейса на русском языке

export const STRINGS = {
  // Шапка витрины
  catalog: 'Каталог',
  productsCount: (n: number) => {
    if (n % 10 === 1 && n % 100 !== 11) return `${n} товар`
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return `${n} товара`
    return `${n} товаров`
  },

  // Кнопка контакта
  contactButton: (name: string) => `Написать ${name}`,
  telegramMessage: 'Здравствуйте! Видел(а) вашу витрину...',

  // Sale banner
  saleUntil: (date: string) => {
    const d = new Date(date)
    const day = d.getDate()
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
    ]
    return `до ${day} ${months[d.getMonth()]}`
  },

  // Цены
  currency: '₽',
  discount: (percent: number) => `-${percent}%`,

  // Главная страница
  homeTitle: 'Витрина-в-кармане',
  homeSubtitle: 'Простая витрина для мастеров — одна ссылка во все мессенджеры',
  homeDescription:
    'Бесплатный прототип: красивый мобильный каталог за 5 минут. Мастер делится ссылкой — клиент видит товары и пишет напрямую в Telegram.',
  homeDemosTitle: 'Живые демо-витрины',
  homeContactTitle: 'Связаться с автором',
  homeContactText: 'Интересует витрина для вашего мастера?',
  homeContactButton: 'Написать в Telegram',

  // Not found
  notFound: 'Витрина не найдена',
  notFoundBack: 'На главную',
} as const
