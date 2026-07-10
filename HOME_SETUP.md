# Как поднять проект на новом компьютере

Короткая инструкция: как начать работать с витриной с другого компа (например, из дома).

---

## Где что лежит

| Что | Где |
|-----|-----|
| Исходный код (главная копия) | GitHub — `github.com/alexmaks/vitrina`, ветка `main` |
| Живой сайт | Vercel — `https://vitrina-kappa.vercel.app` |
| База данных + фото/видео | Supabase (проект `bhiociladvlrliwncloi`) |
| Пароли и ключи | локальный файл `ШПАРГАЛКА.txt` (в git НЕ хранится) |

Код синхронизируется через GitHub: правишь локально → `git push` → Vercel сам пересобирает сайт.

---

## Что установить на новый компьютер

1. **Git** — https://git-scm.com
2. **Node.js** (LTS-версия) — https://nodejs.org
3. **Claude Code** — как обычно
4. (по желанию) **Vercel CLI**: `npm i -g vercel`

---

## Скачать проект

```bash
git clone https://github.com/alexmaks/vitrina.git
cd vitrina
npm install
```

Затем открой **Claude Code прямо в папке `vitrina`** — он прочитает код, файл `AGENTS.md` (важные заметки про версию Next.js) и историю git, и сможет помогать с нуля, без прежней истории чата.

---

## Пароли и ключи (секреты)

Секреты намеренно НЕ лежат в GitHub. Как быть:

- **Чтобы просто править код и деплоить** (`git push`) — секреты локально НЕ нужны. Vercel собирает сайт со своими ключами. Результат смотри на живом адресе `vitrina-kappa.vercel.app`.
- **Чтобы запустить сайт локально** (`npm run dev`) — нужен файл `.env.local` в корне проекта с ключами. Значения взять из `ШПАРГАЛКА.txt` (перенеси её на новый комп безопасно — USB или личный облачный диск, не почтой).

Список переменных для `.env.local` (значения — из `ШПАРГАЛКА.txt`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TELEGRAM_BOT_TOKEN=
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=
SESSION_SECRET=
NEXT_PUBLIC_DOMAIN=
APP_DOMAIN=
NEXT_PUBLIC_YANDEX_METRIKA_ID=
```

> `vercel env pull .env.local` подтянет только несекретные значения; зашифрованные ключи придётся вписать вручную из `ШПАРГАЛКА.txt`.

---

## Запуск локально (для проверки)

```bash
npm run dev
```

Откроется на `http://localhost:3000`.

---

## Как выложить изменения (деплой)

```bash
git add .
git commit -m "что изменил"
git push
```

`git push` в ветку `main` автоматически запускает пересборку на Vercel. Через 1–2 минуты изменения на живом сайте.

Принудительный деплой без изменений: `vercel --prod --yes` (нужен `vercel login`).

---

## Важные заметки о проекте

- **Next.js 16** — нестандартная версия с breaking changes. Перед правкой кода читай `AGENTS.md` и доки в `node_modules/next/dist/docs/`.
- **Supabase на бесплатном тарифе** засыпает после ~7 дней простоя (сайт начинает отдавать 404 / ошибку входа). Есть авто-«будильник» (Vercel Cron → `/api/keepalive`), но если всё же уснул — Supabase Dashboard → проект vitrina → **Restore project**.
- Меняешь структуру базы (новые колонки/таблицы) — сначала выполни SQL в Supabase (SQL Editor), потом деплой код, который её использует. Иначе сайт временно ляжет.
- Все инструкции по деплою, восстановлению и структуре БД — в `ШПАРГАЛКА.txt`.

---

## Резервные копии

- Git-теги `backup-ГГГГММДД` на GitHub — снимки рабочего состояния.
- Локальные zip-архивы — в `C:\Users\Admin\vitrina-backups\` (на этом рабочем компе).

Откат к снимку: `git checkout backup-ГГГГММДД`, вернуться — `git checkout main`.
