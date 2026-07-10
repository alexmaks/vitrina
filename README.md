# Витрина-в-кармане / Pocket Storefront

**EN:** A free, open-source (MIT) mobile storefront for independent artisans and makers anywhere in the world. A craftsperson gets a single shareable link: customers see a fast, mobile-first product catalog and message the maker directly in Telegram — no marketplace fees, no middlemen, no app to install. Current version: Next.js 16 + Supabase, with a merchant admin panel, direct-to-storage media uploads, per-merchant analytics, and a Telegram bot for onboarding. See [DOCS.md](DOCS.md) for the up-to-date architecture.

**RU:** Бесплатная open-source (MIT) мобильная витрина для мастеров и ремесленников. Мастер делится одной ссылкой, клиент видит каталог товаров и пишет напрямую в Telegram — без комиссий маркетплейсов и посредников. Актуальная версия: Next.js 16 + Supabase, админка мастера, загрузка медиа напрямую в хранилище, аналитика по витринам, Telegram-бот. Актуальная архитектура — в [DOCS.md](DOCS.md).

> Ниже — описание прототипа этапа 0 (статическая версия на YAML). Оно сохранено для истории; актуальное состояние проекта см. в [DOCS.md](DOCS.md).

## Быстрый старт

```bash
npm install
npm run dev        # http://localhost:3000
```

## Структура проекта

```
app/               # Next.js App Router
  layout.tsx       # Корневой layout, Yandex Metrika
  page.tsx         # Главная страница (визитка проекта)
  [slug]/page.tsx  # Витрина мастера
components/        # UI-компоненты
data/merchants/    # YAML-данные мастеров (по одному файлу на мастера)
lib/               # Типы, парсер YAML, строки UI
public/
  avatars/         # Аватары мастеров
  products/        # Фото товаров (по папке на мастера)
  og/              # OG-картинки 1200×630 для превью
scripts/           # Вспомогательные скрипты (генерация OG)
```

## Добавить нового мастера

1. Создай файл `data/merchants/{slug}.yaml` по образцу:

```yaml
slug: my-master
name: Название магазина
tagline: Короткое описание
avatar: /avatars/my-master.jpg
telegram: username_bez_sobaki
accentColor: "#3B82F6"   # опционально

# Общая распродажа (опционально)
sale:
  percent: 15
  until: "2026-12-31"
  text: "Скидка -15% на всё"

products:
  - id: product1
    name: Название товара
    price: 1500
    image: /products/my-master/product1.jpg
    discount: 20   # скидка на конкретный товар (опционально)
```

2. Положи фото в `public/products/{slug}/` и аватар в `public/avatars/`
3. Сгенерируй OG-картинку: `node scripts/generate-og.mjs`

## Переменные окружения

| Переменная | Описание | Обязательна |
|---|---|---|
| `NEXT_PUBLIC_YANDEX_METRIKA_ID` | ID счётчика Яндекс.Метрики | Нет |
| `NEXT_PUBLIC_DOMAIN` | Домен деплоя (для OG-тегов) | Рекомендуется |

Создай `.env.local`:
```env
NEXT_PUBLIC_YANDEX_METRIKA_ID=12345678
NEXT_PUBLIC_DOMAIN=https://vitrina.vercel.app
```

## Сборка

```bash
npm run build   # генерирует статику в /out
```

## Деплой на Vercel

1. Создай аккаунт на [vercel.com](https://vercel.com)
2. Подключи GitHub-репозиторий
3. Настройки сборки подхватятся автоматически (`output: 'export'`)
4. Добавь переменные окружения в Project Settings → Environment Variables:
   - `NEXT_PUBLIC_YANDEX_METRIKA_ID`
   - `NEXT_PUBLIC_DOMAIN` (например, `https://vitrina.vercel.app`)
5. Нажми Deploy

Либо через CLI:
```bash
npm i -g vercel
vercel --prod
```

## Деплой на Cloudflare Pages (резервный вариант)

1. В Cloudflare Dashboard → Pages → Create Project
2. Подключи GitHub-репозиторий
3. Настройки:
   - **Build command:** `npm run build`
   - **Output directory:** `out`
4. В Environment Variables добавь:
   - `NEXT_PUBLIC_YANDEX_METRIKA_ID`
   - `NEXT_PUBLIC_DOMAIN`
5. Нажми Save and Deploy

## Настройка Yandex Metrika

1. Зарегистрируйся на [metrika.yandex.ru](https://metrika.yandex.ru)
2. Создай счётчик, включи **Вебвизор** и **Карту кликов**
3. Скопируй ID счётчика в `NEXT_PUBLIC_YANDEX_METRIKA_ID`
4. В счётчике будут автоматически отслеживаться события:
   - `contact_click` — клик по кнопке «Написать мастеру»

## Критерии приёмки

- [ ] `npm run build` — без ошибок
- [ ] Открыть `/baba-zina` на мобильном — корректная вёрстка
- [ ] Кнопка «Написать мастеру» → открывает Telegram с правильным username
- [ ] Ссылка в Telegram → превью с картинкой и описанием
- [ ] Lighthouse Performance ≥ 95, Accessibility ≥ 95, SEO ≥ 95

## License

MIT — see [LICENSE](LICENSE). Free for everyone, forever.
