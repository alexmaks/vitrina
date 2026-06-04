# Витрина-в-кармане — Полная документация

> Последнее обновление: 2026-06-04

---

## Продакшн

- **URL:** https://vitrina-kappa.vercel.app
- **GitHub:** https://github.com/alexmaks/vitrina (ветка `main`)
- **Vercel проект:** `vitrina` (аккаунт Alex_gypsies)
- **Supabase проект:** `bhiociladvlrliwncloi.supabase.co`
- **Telegram бот:** @vitrina_kappa_bot

---

## Стек

- **Next.js 16.2.6** (App Router, ISR)
- **Supabase** (Postgres + Storage)
- **Tailwind CSS**
- **react-hook-form + Zod** (формы в админке)
- **Sharp** (обработка изображений на сервере)

### Важное про Next.js 16

В этой версии `middleware.ts` называется **`proxy.ts`**, а функция должна называться `proxy` (не `middleware`). Это нестандартное поведение данной версии — не менять без необходимости.

---

## Переменные окружения

Хранятся в `.env.local` (локально) и в Vercel Settings → Environment Variables (продакшн).

```
APP_DOMAIN=https://vitrina-kappa.vercel.app        # серверная, не вшивается в бандл
NEXT_PUBLIC_DOMAIN=https://vitrina-kappa.vercel.app
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=vitrina_kappa_bot
TELEGRAM_BOT_USERNAME=vitrina_kappa_bot
TELEGRAM_BOT_TOKEN=<хранится в Vercel и .env.local — не коммитить>
NEXT_PUBLIC_SUPABASE_URL=https://bhiociladvlrliwncloi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<хранится в Vercel и .env.local — не коммитить>
SUPABASE_SERVICE_ROLE_KEY=<хранится в Vercel и .env.local — не коммитить>
SESSION_SECRET=<хранится в Vercel и .env.local — не коммитить>
TELEGRAM_WEBHOOK_SECRET=<хранится в Vercel и .env.local — не коммитить>
NEXT_PUBLIC_YANDEX_METRIKA_ID=109276332
```

> ⚠️ `APP_DOMAIN` — серверная переменная (без NEXT_PUBLIC_). Читается только в рантайме, не вшивается в клиентский бандл. Используется ботом для генерации ссылок.

> ⚠️ `NEXT_PUBLIC_*` переменные вшиваются в бандл при сборке. Если менять в Vercel — нужен редеплой.

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
| image_url | text | Главное фото (обложка) — для обратной совместимости |
| image_urls | text[] | Все фото товара в порядке (до 10 штук) |
| discount_percent | int | Скидка на конкретный товар |
| is_available | boolean | В наличии |
| sort_order | int | Порядок сортировки |

> `image_url` = первый элемент `image_urls`. Оба поля обновляются при сохранении. Если `image_urls` пустой — фолбэк на `image_url` (обратная совместимость).

### Таблица `login_tokens`

| Поле | Тип | Описание |
|---|---|---|
| token | text | PK, случайная строка 20 символов |
| merchant_id | uuid | FK → merchants.id (заполняется ботом после /start) |
| created_at | timestamptz | Дата создания |
| expires_at | timestamptz | Срок действия (10 минут) |

Используется для polling-авторизации с мобильных устройств.

### SQL для создания таблиц (если нужно пересоздать)

```sql
-- login_tokens
create table login_tokens (
  token text primary key,
  merchant_id uuid references merchants(id) on delete cascade,
  created_at timestamptz default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);
create index on login_tokens(expires_at);

-- Добавить столбец image_urls к products (если нет)
alter table products add column image_urls text[] default '{}';
```

### RLS политики

- Публичное чтение только опубликованных витрин и их товаров
- Запись — только через `service_role` (с сервера), клиент никогда не пишет напрямую

### Storage бакеты

| Бакет | Доступ | Путь файлов |
|---|---|---|
| `avatars` | публичный | `{merchantId}.webp` |
| `products` | публичный | `{merchantId}/{productId}_{index}.webp` |

---

## Структура файлов

```
proxy.ts                          # Защита /admin/* и /api/revalidate (сессия)
app/
  page.tsx                        # Лендинг: если залогинен → /admin/products
  login/page.tsx                  # Страница входа (polling через бота)
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
    auth/telegram/route.ts        # POST (виджет десктоп) + GET (мобильный redirect)
    auth/magic/route.ts           # GET: magic link → устанавливает cookie (legacy)
    auth/bot-init/route.ts        # GET: создаёт login_token, возвращает {token, botUrl}
    auth/poll/route.ts            # GET: проверяет готовность login_token
    auth/complete/route.ts        # GET: устанавливает cookie по готовому login_token
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
  magic-link.ts                   # Подписанные токены (legacy magic-link flow)
  merchants-db.ts                 # Запросы к Supabase (витрина + admin)
  supabase/admin.ts               # service_role клиент (только сервер)
  supabase/server.ts              # SSR клиент с cookies
  supabase/client.ts              # Браузерный клиент
  slugify.ts                      # Транслитерация → URL-slug
  types.ts                        # TypeScript типы (Merchant, Product, Sale)
  strings.ts                      # Все строки интерфейса
components/
  StorefrontHeader.tsx            # Шапка витрины (аватар, имя, tagline)
  ProductGallery.tsx              # Сетка товаров с тапом → шторка (client)
  ProductSheet.tsx                # Шторка товара (фото-карусель, zoom, жесты)
  ProductCard.tsx                 # Карточка (только для переиспользования)
  ProductGrid.tsx                 # Простая сетка без интерактивности
  SaleBanner.tsx                  # Баннер распродажи
  ContactButton.tsx               # Кнопка «Написать» (Telegram)
  YandexMetrika.tsx               # Счётчик Яндекс Метрики
  admin/
    BottomNav.tsx                 # Нижняя навигация PWA (4 пункта)
    MerchantContext.tsx           # React Context с данными мастера
    ProductForm.tsx               # Форма товара (мульти-фото, создание + ред.)
scripts/
  migrate-yaml.mjs                # Миграция демо-данных YAML → Supabase
```

---

## Авторизация

### Основной способ — Polling через бота (любой браузер)

Работает в Safari, Chrome, любом мобильном браузере. Пользователь остаётся в одном браузере — cookie сохраняется и PWA можно добавить на рабочий стол.

**Схема:**
1. `/login` → кнопка «Войти через Telegram»
2. Браузер вызывает `GET /api/auth/bot-init`:
   - Генерируется случайный токен (20 символов)
   - В `login_tokens` создаётся запись (без merchant_id, срок 10 мин)
   - Возвращается `{ token, botUrl }` где botUrl = `https://t.me/vitrina_kappa_bot?start=TOKEN`
3. Страница переходит в режим ожидания, опрашивает `GET /api/auth/poll?token=TOKEN` каждые 2 сек
4. Открывается Telegram — пользователь нажимает **Start**
5. Бот получает `/start TOKEN` через вебхук:
   - Делает upsert мастера в `merchants`
   - Обновляет `login_tokens` — проставляет `merchant_id`
   - Отправляет: «Авторизация подтверждена. Вернитесь в браузер»
6. Опрос возвращает `{ ready: true }` → браузер переходит на `GET /api/auth/complete?token=TOKEN`
7. `/api/auth/complete`: читает токен, удаляет его (одноразовый), создаёт сессию, возвращает HTML-страницу с cookie + авто-редирект
8. Пользователь в `/admin/products` или `/admin/setup`

**Дополнительно:** при `visibilitychange` (возврат из Telegram) происходит мгновенная проверка `/api/auth/poll`.

### Бот без токена (`/start` вручную)

Если пользователь открывает бота напрямую (не через кнопку на странице входа), бот присылает текст со ссылкой на страницу входа. **Кнопку не отправляем** — она бы открылась в браузере Telegram, откуда нельзя сохранить PWA.

### Legacy — Magic Link

Если кто-то использует старую ссылку `/api/auth/magic?token=...` — она всё ещё работает. Показывает HTML-страницу с cookie и кнопкой (не 302-редирект — iOS WebKit теряет cookie при редиректах).

### Сессия

- Cookie: `vitrina_session`, HTTP-only, Secure, SameSite=Lax, 30 дней
- Формат: `base64url(payload).hmac_sha256`
- Payload: `{ merchantId, telegramId, slug, iat }`
- Реализация: Web Crypto API (работает в Edge Runtime / Node.js)
- `proxy.ts` проверяет сессию на каждом запросе к `/admin/*` и `/api/revalidate`

---

## Витрина (ISR)

- Страница `app/[slug]/page.tsx` — ISR с `revalidate = 60` секунд
- После сохранения товара/настроек вызывается `revalidatePath(`/${slug}`)` — витрина обновляется при следующем запросе
- Данные из Supabase через admin-клиент (обходит RLS)

### Карточки товаров

- Тап на карточку → открывается шторка (`ProductSheet`)
- Шторка снизу, анимация slide-up
- **Жесты:**
  - Свайп вниз по ручке → закрыть
  - Двойной тап по фото → zoom 2.5x / обратно
  - Pinch двумя пальцами → zoom 1x–4x
  - Свайп по фото влево/вправо → следующее/предыдущее фото товара (если их несколько)
- Показывает: все фото с каруселью, точки-индикатор, название, цену, описание
- Кнопка «Написать про этот товар» → Telegram с названием товара в тексте
- Кнопка «Спросить про наличие» → для товаров не в наличии

---

## Товары и фото

- До **10 фото** на один товар
- В форме редактирования — горизонтальная лента слотов
- Первое фото = **Обложка** (показывается в сетке каталога)
- Каждое фото загружается сразу при выборе (не ждёт сохранения)
- Обработка через Sharp: resize до 1080×1080, WebP, quality 80
- Путь в Storage: `products/{merchantId}/{productId}_{index}.webp`
- Товары «нет в наличии» — показываются с бейджем и opacity 60%

---

## Демо-витрины

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

# Принудительный сброс ISR-кеша витрины
curl -X POST https://vitrina-kappa.vercel.app/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{"slug":"baba-zina"}'
```

### Настройка вебхука бота (одноразово или после смены домена)

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://vitrina-kappa.vercel.app/api/bot/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

### Настройка домена в BotFather

```
/setdomain → @vitrina_kappa_bot → vitrina-kappa.vercel.app
```

---

## Исправленные баги

| Баг | Причина | Решение |
|---|---|---|
| Все новые товары — одинаковое фото | Файл всегда `new.webp` | `crypto.randomUUID()` через `useRef` |
| Товары «нет в наличии» пропадали | `.filter(p => p.is_available)` | Убран фильтр, добавлен бейдж |
| Logout → старый домен | Хардкод `NEXT_PUBLIC_DOMAIN` | `new URL(request.url).origin` |
| Бот генерировал ссылки со старым доменом | `NEXT_PUBLIC_*` вшивается при сборке | Серверная переменная `APP_DOMAIN` |
| Мобильный вход не работал (iOS Safari) | Telegram Widget не работает на мобильных | Polling-flow через бота |
| Cookie сбрасывался на iOS при редиректе | iOS WebKit теряет cookie при 302 | HTML 200 с cookie вместо 302 |
| `btoa` падал с кириллицей | `btoa` не поддерживает Unicode | `btoa(unescape(encodeURIComponent(...)))` |
| Вход сломался после добавления image_urls | Столбец не существовал в БД, запрос падал | Миграция + hotfix на время до миграции |

---

## Аудит безопасности

### Исправлено

| # | Файл | Проблема | Решение |
|---|---|---|---|
| КРИТ-2 | `api/bot/telegram/route.ts` | Webhook без проверки источника | `X-Telegram-Bot-Api-Secret-Token` |
| ВАЖН-2 | `api/auth/telegram/route.ts` | Окно `auth_date` 24ч | Сужено до 3600 сек |
| ВАЖН-5 | `api/admin/sale/route.ts` | `request.json()` без `try/catch` | Добавлен `try/catch` |
| ЗАМ-2/3 | `lib/session.ts`, `lib/magic-link.ts` | `btoa` не поддерживает Unicode | `btoa(unescape(encodeURIComponent(...)))` |
| ЗАМ-4 | `next.config.ts` | Wildcard `*.supabase.co` | Конкретный hostname |
| ЗАМ-7 | `api/revalidate/route.ts` | slug не валидируется | `isSlugValid()` |

### Отложено (требует инфраструктуры)

| # | Проблема | Что нужно |
|---|---|---|
| КРИТ-1 | Magic-link можно использовать дважды | Redis/Upstash для хранения использованных `jti` |
| КРИТ-3 | In-memory rate limiter сбрасывается при cold-start | Redis/Upstash с `INCR`/`EXPIRE` |

---

## Откат к предыдущей версии

```bash
git log --oneline
git checkout <хэш_коммита>
vercel --prod --yes
git checkout main
```
