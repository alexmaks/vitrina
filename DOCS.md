# Витрина-в-кармане — Полная документация (Этап 1)

## Продакшн

- **URL:** https://vitrina-kappa.vercel.app
- **GitHub:** https://github.com/alexmaks/vitrina (ветка `main`)
- **Vercel проект:** `vitrina` (аккаунт Alex_gypsies)
- **Supabase проект:** `bhiociladvlrliwncloi.supabase.co`
- **Telegram бот:** @vitrina_kappa_bot

---

## Переменные окружения

Хранятся в `.env.local` (локально) и в Vercel Settings → Environment Variables (продакшн).

```
NEXT_PUBLIC_YANDEX_METRIKA_ID=109276332
NEXT_PUBLIC_DOMAIN=https://vitrina-kappa.vercel.app
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=vitrina_kappa_bot
TELEGRAM_BOT_USERNAME=vitrina_kappa_bot
TELEGRAM_BOT_TOKEN=<хранится в Vercel и .env.local — не коммитить>
NEXT_PUBLIC_SUPABASE_URL=https://bhiociladvlrliwncloi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<хранится в Vercel и .env.local — не коммитить>
SUPABASE_SERVICE_ROLE_KEY=<хранится в Vercel и .env.local — не коммитить>
SESSION_SECRET=<хранится в Vercel и .env.local — не коммитить>
TELEGRAM_WEBHOOK_SECRET=<хранится в Vercel и .env.local — не коммитить>
```

> ⚠️ В Vercel переменная `NEXT_PUBLIC_DOMAIN` может быть устаревшей (`vitrina-2ohm.vercel.app`) — нужно обновить вручную в дашборде на `https://vitrina-kappa.vercel.app`.

---

## База данных Supabase

### Таблица `merchants`

| Поле | Тип | Описание |
|---|---|---|
| id | uuid | PK, auto |
| telegram_id | bigint unique | ID пользователя в Telegram |
| telegram_username | text | @username |
| telegram_first_name | text | Имя |
| slug | text unique | URL-адрес витрины (напр. `baba-zina`) |
| name | text | Отображаемое имя |
| tagline | text | Подзаголовок |
| avatar_url | text | URL аватара в Supabase Storage |
| accent_color | text | Цвет акцента (default `#854F0B`) |
| sale_percent | int | Процент распродажи |
| sale_until | timestamptz | До какого числа |
| sale_text | text | Текст баннера распродажи |
| contact_telegram | text | Telegram для кнопки «Написать» |
| is_published | boolean | Опубликована ли витрина |
| created_at | timestamptz | Дата создания |

### Таблица `products`

| Поле | Тип | Описание |
|---|---|---|
| id | uuid | PK, auto |
| merchant_id | uuid | FK → merchants.id (cascade delete) |
| name | text | Название |
| price | int | Цена в рублях |
| description | text | Описание |
| image_url | text | URL в Supabase Storage |
| discount_percent | int | Скидка на конкретный товар |
| is_available | boolean | В наличии |
| sort_order | int | Порядок сортировки |

### RLS политики

- Публичное чтение только опубликованных витрин и их товаров
- Запись — только через `service_role` (с сервера), клиент никогда не пишет напрямую

### Storage бакеты

| Бакет | Доступ | Путь файлов |
|---|---|---|
| `avatars` | публичный | `{merchantId}.webp` |
| `products` | публичный | `{merchantId}/{uuid}.webp` |

---

## Архитектура приложения

### Стек

- **Next.js 16.2.6** (App Router, ISR)
- **Supabase** (Postgres + Storage)
- **Tailwind CSS**
- **react-hook-form + Zod** (формы в админке)
- **Sharp** (обработка изображений на сервере)

### Важное про Next.js 16

В этой версии `middleware.ts` называется **`proxy.ts`**, а функция должна называться `proxy` (не `middleware`). Это нестандартное поведение данной версии — не менять без необходимости.

---

## Структура файлов

```
proxy.ts                          # Защита /admin/* и /api/revalidate (сессия)
app/
  page.tsx                        # Лендинг: если залогинен → /admin/products
  login/page.tsx                  # Страница входа (виджет + кнопка бота)
  [slug]/page.tsx                 # Витрина мастера (ISR 60 сек)
  admin/
    layout.tsx                    # Обёртка: сессия + MerchantContext + BottomNav
    page.tsx                      # Редирект → /admin/products
    setup/page.tsx                # Первичная настройка (название, slug, аватар)
    products/page.tsx             # Список товаров
    products/new/page.tsx         # Добавить товар
    products/[id]/page.tsx        # Редактировать / удалить товар
    sale/page.tsx                 # Настройки распродажи
    settings/page.tsx             # Настройки профиля
    share/page.tsx                # Поделиться ссылкой + QR
  api/
    auth/telegram/route.ts        # POST (виджет) + GET (мобильный редирект)
    auth/magic/route.ts           # GET: magic link от бота → устанавливает cookie
    auth/logout/route.ts          # POST: очищает cookie, редирект на /
    bot/telegram/route.ts         # POST: вебхук Telegram бота
    upload/route.ts               # POST: загрузка фото → Supabase Storage
    slug-check/route.ts           # GET: проверка уникальности slug
    revalidate/route.ts           # POST: принудительный сброс ISR-кеша
    admin/sale/route.ts           # POST: сохранить настройки распродажи
    admin/settings/route.ts       # POST: сохранить настройки профиля
    admin/setup/route.ts          # POST: первичная настройка
lib/
  session.ts                      # HMAC-SHA256 сессии (Web Crypto API)
  magic-link.ts                   # Подписанные токены для входа через бота
  merchants-db.ts                 # Запросы к Supabase (витрина + admin)
  supabase/admin.ts               # service_role клиент (только сервер)
  supabase/server.ts              # SSR клиент с cookies
  supabase/client.ts              # Браузерный клиент
  slugify.ts                      # Транслитерация → URL-slug
  types.ts                        # TypeScript типы (Merchant, Product, Sale)
  strings.ts                      # Все строки интерфейса
components/
  StorefrontHeader.tsx            # Шапка витрины (аватар, имя, tagline)
  ProductGrid.tsx                 # Сетка товаров
  ProductCard.tsx                 # Карточка (скидка / «нет в наличии»)
  SaleBanner.tsx                  # Баннер распродажи
  ContactButton.tsx               # Кнопка «Написать» (Telegram)
  YandexMetrika.tsx               # Счётчик Яндекс Метрики
  admin/
    BottomNav.tsx                 # Нижняя навигация PWA (4 пункта)
    MerchantContext.tsx           # React Context с данными мастера
    ProductForm.tsx               # Форма товара (создание + редактирование)
scripts/
  migrate-yaml.mjs                # Миграция демо-данных YAML → Supabase
```

---

## Авторизация

### Десктоп (Telegram Login Widget)

1. `/login` → Telegram Login Widget → popup
2. JS callback `onTelegramAuth(user)` → `POST /api/auth/telegram`
3. Сервер проверяет HMAC-подпись Telegram, upsert в `merchants`
4. Устанавливает HTTP-only cookie `vitrina_session` (30 дней)
5. Редирект → `/admin/products` (старый) или `/admin/setup` (новый)

### Мобильный (через бота)

1. `/login` → кнопка «Открыть бота Telegram» → `https://t.me/vitrina_kappa_bot`
2. Пользователь нажимает **Start** → бот получает сообщение через вебхук
3. Вебхук `/api/bot/telegram`: upsert мастера, генерирует подписанный magic-link (10 мин)
4. Бот присылает кнопку **«🚀 Войти в витрину»** с magic-link
5. Пользователь нажимает → `GET /api/auth/magic?token=...`
6. Сервер проверяет HMAC-подпись → устанавливает cookie → редирект в админку

### Сессия

- Cookie: `vitrina_session`, HTTP-only, Secure, SameSite=Lax, 30 дней
- Формат: `base64url(payload).hmac_sha256`
- Payload: `{ merchantId, telegramId, slug, iat }`
- Реализация: Web Crypto API (работает в Edge Runtime / Node.js)
- `proxy.ts` проверяет сессию на каждом запросе к `/admin/*` и `/api/revalidate`

---

## Витрины (ISR)

- Страница `app/[slug]/page.tsx` — ISR с `revalidate = 60` секунд
- После сохранения товара/настроек вызывается `revalidatePath(`/${slug}`)` — витрина обновляется при следующем запросе
- Данные берутся из Supabase через admin-клиент (обходит RLS, не зависит от cookies)

---

## Демо-витрины

Созданы командой `node scripts/migrate-yaml.mjs` из YAML-файлов в `data/merchants/`:

| Slug | Мастер | Товаров |
|---|---|---|
| `baba-zina` | Носки от бабы Зины | 8 |
| `cake-anna` | Тортики Анны | 6 |
| `flowers-lena` | Букеты от Лены | 4 |

---

## Деплой

```bash
# Локальный запуск
npm run dev

# Деплой в продакшн
vercel --prod --yes

# Принудительный сброс ISR-кеша витрины (если не обновилась)
curl -X POST https://vitrina-kappa.vercel.app/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{"slug":"baba-zina"}'
```

### Настройка вебхука бота (одноразово, или после смены домена)

```bash
curl "https://api.telegram.org/botREDACTED/setWebhook?url=https://vitrina-kappa.vercel.app/api/bot/telegram"
```

Ожидаемый ответ: `{"ok":true,"result":true}`

### Настройка домена в BotFather (если меняется домен)

```
/setdomain → @vitrina_kappa_bot → vitrina-kappa.vercel.app
```

---

## Исправленные баги

| Баг | Причина | Решение |
|---|---|---|
| Все новые товары имели одинаковое изображение | Файл всегда загружался как `new.webp` | `crypto.randomUUID()` через `useRef` |
| Товары «нет в наличии» исчезали с витрины | `.filter(p => p.is_available)` в `merchants-db.ts` | Убран фильтр, добавлен бейдж и `opacity-60` |
| Logout редиректил на старый домен | Хардкод `NEXT_PUBLIC_DOMAIN` | Используем `new URL(request.url).origin` |
| Мобильный вход не работал на iOS | Telegram Login Widget не вызывает JS callback на мобильных | Добавлен вход через бота с magic-link |
| ISR кешировал пустые витрины | `dynamic = 'force-static'` | Убрано, `revalidate = 60` |

---

## Откат к предыдущей версии

```bash
# Посмотреть историю коммитов
git log --oneline

# Откатиться к конкретному коммиту (не удаляя изменения)
git checkout <хэш_коммита>

# Задеплоить старую версию
vercel --prod --yes

# Вернуться обратно на актуальную версию
git checkout main
```

### Хэши коммитов (от новых к старым)

```
76eff72  fix: logout редиректит на текущий домен
40f1950  feat: вход через бота для мобильных (magic link)
b00d696  fix: поддержка Telegram Login Widget на мобильных
833c775  chore: убрана суперадмин страница
714d782  feat: товары "нет в наличии" с бейджем
dddd66b  fix: уникальный ID для загрузки изображений
6946094  fix: контакт автора → @Alex_gypsies
8a22ce5  fix: ISR revalidate 60s, ссылка автора, id товаров
6a1efe7  feat: этап 1 — PWA-админка + Supabase (основной коммит)
348dc14  Initial commit from Create Next App
```
