# Витрина-в-кармане — Полная документация

> Последнее обновление: 2026-05-26

---

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

> ⚠️ `APP_DOMAIN` — серверная переменная без префикса NEXT_PUBLIC_. Читается только в рантайме на сервере, не вшивается в клиентский бандл при сборке. Используется в боте для генерации ссылок.

> ⚠️ `NEXT_PUBLIC_*` переменные вшиваются в бандл при сборке (build time). Если менять в Vercel — нужен редеплой.

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

### Таблица `login_tokens`

| Поле | Тип | Описание |
|---|---|---|
| token | text | PK, случайная строка 20 символов |
| merchant_id | uuid | FK → merchants.id (заполняется ботом) |
| created_at | timestamptz | Дата создания |
| expires_at | timestamptz | Срок действия (10 минут) |

Используется для polling-авторизации с мобильных устройств (см. раздел «Авторизация»).

SQL для создания:
```sql
create table login_tokens (
  token text primary key,
  merchant_id uuid references merchants(id) on delete cascade,
  created_at timestamptz default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);
create index on login_tokens(expires_at);
```

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

### Структура файлов

```
proxy.ts                          # Защита /admin/* и /api/revalidate (сессия)
app/
  page.tsx                        # Лендинг: если залогинен → /admin/products
  login/page.tsx                  # Страница входа (polling + Telegram Widget)
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
    auth/magic/route.ts           # GET: magic link от бота → устанавливает cookie
    auth/bot-init/route.ts        # GET: создаёт login_token в БД, возвращает {token, botUrl}
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
  magic-link.ts                   # Подписанные токены для входа через бота (legacy)
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

### Мобильный — основной способ (Polling через бота)

Работает в любом браузере (Safari, Chrome). Пользователь не покидает браузер надолго — cookie сохраняется.

**Схема:**
1. `/login` → пользователь нажимает «Войти через Telegram»
2. Браузер вызывает `GET /api/auth/bot-init`:
   - Генерируется случайный токен (20 символов)
   - В таблице `login_tokens` создаётся запись с этим токеном (без merchant_id, срок 10 мин)
   - Возвращается `{ token, botUrl }` где `botUrl = https://t.me/vitrina_kappa_bot?start=TOKEN`
3. Страница переходит в состояние «Ожидаем подтверждения» и начинает опрашивать `GET /api/auth/poll?token=TOKEN` каждые 2 секунды
4. Открывается Telegram — пользователь нажимает **Start**
5. Бот получает `/start TOKEN` через вебхук (`POST /api/bot/telegram`):
   - Делает upsert мастера в `merchants`
   - Обновляет запись в `login_tokens` — проставляет `merchant_id`
   - Отправляет сообщение: «Авторизация подтверждена. Вернитесь в браузер»
6. Опрос `/api/auth/poll` возвращает `{ ready: true }`
7. Браузер переходит на `GET /api/auth/complete?token=TOKEN`:
   - Читает `login_tokens`, получает `merchant_id`
   - Удаляет токен из БД (одноразовый)
   - Получает данные мастера из `merchants`
   - Устанавливает HTTP-only cookie с сессией
   - Возвращает HTML-страницу с кнопкой + авто-редиректом через 500 мс
8. Пользователь попадает в `/admin/products` или `/admin/setup`

**Дополнительно:** при событии `visibilitychange` (возврат из Telegram в браузер) происходит мгновенная внеочередная проверка `/api/auth/poll`.

**Файлы:**
- `app/api/auth/bot-init/route.ts`
- `app/api/auth/poll/route.ts`
- `app/api/auth/complete/route.ts`
- `app/api/bot/telegram/route.ts` (обрабатывает `/start TOKEN`)
- `app/login/page.tsx` (polling UI)

### Десктоп — Telegram Login Widget

1. `/login` → Telegram Login Widget → всплывающее окно авторизации
2. JS callback `onTelegramAuth(user)` → `POST /api/auth/telegram`
3. Сервер проверяет HMAC-подпись Telegram, upsert в `merchants`
4. Устанавливает HTTP-only cookie `vitrina_session` (30 дней)
5. Редирект → `/admin/products` (старый) или `/admin/setup` (новый)

### Legacy — Magic Link (резервный)

Если пользователь открывает бота напрямую (без токена в `/start`), бот генерирует подписанный magic-link и присылает кнопку. Пользователь нажимает → `GET /api/auth/magic?token=...` → cookie + HTML с кнопкой.

Ограничение: работает в браузере Telegram (WebView), оттуда нельзя сохранить PWA на рабочий стол.

### Сессия

- Cookie: `vitrina_session`, HTTP-only, Secure, SameSite=Lax, 30 дней
- Формат: `base64url(payload).hmac_sha256`
- Payload: `{ merchantId, telegramId, slug, iat }`
- Реализация: Web Crypto API (работает в Edge Runtime / Node.js)
- `proxy.ts` проверяет сессию на каждом запросе к `/admin/*` и `/api/revalidate`

### Почему HTML вместо 302 при установке cookie

iOS WebKit (Safari, Telegram WebView) сбрасывает `Set-Cookie` заголовки при 302-редиректах. Решение: возвращаем `200 OK` с HTML-страницей, на которой есть кнопка и авто-редирект через 500–800 мс. Cookie устанавливается вместе с 200-ответом и надёжно сохраняется.

---

## Витрины (ISR)

- Страница `app/[slug]/page.tsx` — ISR с `revalidate = 60` секунд
- После сохранения товара/настроек вызывается `revalidatePath(`/${slug}`)` — витрина обновляется при следующем запросе
- Данные берутся из Supabase через admin-клиент (обходит RLS, не зависит от cookies)

---

## Товары

- Товары «нет в наличии» (`is_available = false`) **отображаются** на витрине с бейджем «Нет в наличии» и opacity 60%
- Уникальность имён файлов при загрузке: `crypto.randomUUID()` через `useRef` в `ProductForm.tsx` — исключает перезапись чужих изображений

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

### Настройка вебхука бота (одноразово, или после смены домена)

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://vitrina-kappa.vercel.app/api/bot/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
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
| Бот генерировал magic-link со старым доменом | `NEXT_PUBLIC_*` вшивается при сборке, не обновлялся | Добавлена серверная переменная `APP_DOMAIN` |
| Мобильный вход не работал (iOS Safari) | Telegram Login Widget не вызывает JS callback на мобильных | Реализован polling-flow через бота |
| Cookie сбрасывался на iOS при редиректе | iOS WebKit теряет `Set-Cookie` при 302 | Возвращаем 200 HTML с кнопкой вместо 302 |
| `btoa` падал с кириллицей в slug | `btoa` не поддерживает Unicode | `btoa(unescape(encodeURIComponent(...)))` |

---

## Аудит безопасности (проведён 2026-05-20)

### Исправлено

| # | Файл | Проблема | Решение |
|---|---|---|---|
| КРИТ-2 | `api/bot/telegram/route.ts` | Webhook без проверки источника | Добавлена проверка `X-Telegram-Bot-Api-Secret-Token` |
| ВАЖН-2 | `api/auth/telegram/route.ts` | Окно `auth_date` 24ч | Сужено до 3600 сек |
| ВАЖН-5 | `api/admin/sale/route.ts` | `request.json()` без `try/catch` | Добавлен `try/catch` |
| ВАЖН-8 | `api/bot/telegram/route.ts` | Продакшн домен захардкожен | Бросает ошибку при отсутствии переменной |
| ЗАМ-2/3 | `lib/session.ts`, `lib/magic-link.ts` | `btoa` не поддерживает Unicode | Заменён на `btoa(unescape(encodeURIComponent(...)))` |
| ЗАМ-4 | `next.config.ts` | Wildcard `*.supabase.co` слишком широк | Указан конкретный hostname проекта |
| ЗАМ-7 | `api/revalidate/route.ts` | slug не валидируется | Добавлен `isSlugValid()` |

### Требует инфраструктуры (отложено)

| # | Проблема | Что нужно |
|---|---|---|
| КРИТ-1 | Magic-link можно использовать дважды (replay attack) | Redis/Upstash для хранения использованных `jti` |
| КРИТ-3 | In-memory rate limiter сбрасывается при cold-start | Redis/Upstash с атомарным `INCR`/`EXPIRE` |

---

## Откат к предыдущей версии

```bash
# Посмотреть историю коммитов
git log --oneline

# Откатиться к конкретному коммиту
git checkout <хэш_коммита>

# Задеплоить старую версию
vercel --prod --yes

# Вернуться обратно на актуальную версию
git checkout main
```
