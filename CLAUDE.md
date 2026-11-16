# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

Дев-стенд сайта **bandana-dance.ru** — монорепозиторий из двух исторически отдельных проектов:
- `bandana-client/` — публичный сайт (React 19 + CRA, MobX, MUI, React Router 7)
- `bandana-server/` — API + Telegram-бот админки (Express 5, Sequelize/PostgreSQL, Telegraf 4)

Контента-менеджмента через веб нет: **весь контент (события, галерея, видео, команда, мастер-классы, модерация отзывов) правится через Telegram-бота**, а сайт его только читает.

## Команды

Все команды — из корня, если не указано иное. Шелл — PowerShell; Bash-инструмент тоже доступен.

```
npm install                          # в корне (concurrently), один раз
npm install --prefix bandana-server  # один раз
npm install --prefix bandana-client  # один раз
cp bandana-server/.env.example bandana-server/.env   # заполнить BOT_TOKEN, ADMINS_ID и БД

npm run dev        # Postgres (docker) + сервер :5000 + клиент :3000 параллельно
npm run postgres   # только поднять Postgres (docker compose up -d)
npm run server     # только сервер (nodemon index.js)
npm run client     # только клиент (react-scripts start)
```

Внутри `bandana-server/`: `npm run dev` (nodemon), `npm start` (node), `npm run start:pm2`.
Внутри `bandana-client/`: `npm start`, `npm run build`, `npm test` (react-scripts / jest).
Запуск одного теста клиента: `cd bandana-client && npx react-scripts test src/path/to/File.test.js --watchAll=false`.

Линтера/форматтера как отдельных команд нет; клиент использует встроенный eslint CRA (`react-app`).

## Инфраструктура и окружение

- **Postgres** поднимается через корневой `docker-compose.yml` на порту **55432** (не 5432 — чтобы не конфликтовать с локальным Postgres). `DB_*` в `bandana-server/.env` должны указывать на него.
- Клиент в dev ходит на `http://localhost:5000` (`bandana-client/.env.development`, `REACT_APP_API_URL`). В проде дефолт — `https://bandana-dance.ru` (захардкожен в `bandana-client/src/shared/api/api.js`).
- CORS сервера читает `CORS_ORIGINS` (список через запятую). Дефолт при отсутствии — `https://bandana-dance.ru`.
- Прод: клиент собирается `npm run build` и раздаётся Nginx; сервер — через PM2.
- Секреты (`.env`, `proxies.txt`) в `.gitignore`. `server-live-diffs/` — снапшот-патчи живого сервера, не трогать при обычной разработке.

## Архитектура сервера (`bandana-server/`)

`index.js` — единая точка входа и единственный `app.listen`. Делает всё при старте:
1. Подключается к Postgres (`config/db.js` — один экземпляр Sequelize).
2. **Применяет миграции через Umzug** (`runMigrations()` из `./migrate.js`, файлы в `migrations/*.js`, применённые отслеживаются в таблице `SequelizeMeta`). `Model.sync` больше не используется. Меняя модель — пиши новую миграцию (идемпотентную, по образцу `0001-baseline.js`); вручную: `npm run migrate`.
3. Запускает Telegram-бота через `launchBotWithRetry` (ретраи, т.к. прокси до Telegram API нестабилен).
4. Запускает message-monitor (`startMessageMonitor`).

HTTP-слой: helmet → CORS → cookie-parser → rate-limit/slow-down → `express.json({ limit: "200kb" })` (фото грузятся через бота, не через HTTP) → статика `/uploads` → всё API под префиксом **`/api`** (`routes/router.js`). Один `UserController` (`controller/userController.js`, ~740 строк) обслуживает все роуты; внутренние роуты (`/notify-user`, `/admin/*`) закрыты `middleware/internalAuth.js` (заголовок `X-Internal-Secret` = `INTERNAL_API_SECRET`, без секрета — 503). Загруженные файлы (фото из Telegram) лежат в `uploads/` и отдаются статикой; ссылки строятся от `PUBLIC_URL`.

### Telegram-бот (`bot/`) — админка контента
- `bot/bot.js` собирает `Telegraf`, регистрирует все `Scenes.Stage`-сцены, middleware и экшены, экспортирует `bot` (запускается из `index.js`).
- **Авторизация** — простая: `ADMINS_ID` (CSV Telegram-id в `.env`). Middleware отбивает всех, кто не админ (`"Ты не админ🤡"`). Проверяй это при добавлении команд.
- `bot/commands/` — обработчики команд меню (events, gallery, video, team, reviews, masterclasses).
- `bot/scenes/<домен>/` — пошаговые сцены create/update/delete по каждой сущности; модерация отзывов в `scenes/moderations/`. Новую сцену нужно добавить и в массив `Stage`, и (если навигационная) в общий regex `stage.action(...)` в `bot.js`.
- `bot/utils/telegramProxyAgent.js` — прокси для обхода блокировки Telegram API (RKN). Источник: env `TELEGRAM_PROXY` или первая строка `proxies.txt` (единый пул прокси с zynto-bot). **Важно:** формат `host:port:user:pass` трактуется как `http://` (CONNECT), а не `socks5://` — ошибочный socks5 детерминированно ронял `bot.launch()` по таймауту.
- `bot/utils/messageMonitor.js` — отдельный бот (`MONITOR_BOT_TOKEN`), архивирует/пересылает владельцу сообщения из чатов. **Выключен по умолчанию** (`MONITOR_ENABLED=false`); включать только при согласии участников.

### Анти-абуз отзывов (`middleware/reviewRateLimiter.js`)
Публичные отзывы защищены самописным механизмом (НЕ express-rate-limit):
- Посетитель идентифицируется **подписанной HMAC-cookie** `visitor_id` (секрет `COOKIE_SECRET` — обязателен, без него сервер падает на старте). Логика sign/verify — в едином модуле `services/cookieService.js`, его импортируют и `userController`, и `reviewRateLimiter`.
- Лимит: 3 отзыва/час по cookie; дубль на один мастер-класс запрещён; блокировка на 60 дней.
- Блокировка и отзывы хранятся в одной таблице `Review` (`is_blocked`, `blocked_at`, `blocked_reason`, `cookie_id`, `ip_address`). Разблокировка — через бота (`/unblock`, `/blocked`, кнопки) либо `/api/admin/unblock-user/:cookieId`.

### Модели (`models/`)
Sequelize-модели: `master_classes`, `events`, `gallery`, `video`, `teams`, `review`, `notification`, `user`, `chat`, `message`. Ассоциации (напр. `Review belongsTo MasterClasses`) объявлены **в `index.js` после импорта всех моделей**, не внутри файлов моделей.

## Архитектура клиента (`bandana-client/`)

**Feature-Sliced Design.** Слои под `src/` (импорт идёт сверху вниз):
- `app` → здесь только `App.jsx` + `providers/RouterProvider.jsx` (роутинг, lazy-страницы).
- `pages/` — `Home`, `Gallery`, `Teams`, `Reviews` (роуты в `shared/config/routes.js`).
- `widget/` — крупные блоки страниц (HeroSection, Events, Reviews, Teams, Contact, Header, Forma и т.д.), каждый со своим `ui/`.
- `features/`, `entities/` (`model/windowStore.js` — MobX-стор), `shared/` (`api/`, `config/`, `ui/`, `img`, `svg`, `fonts`).

**Весь доступ к API — через singleton `shared/api/api.js`** (`ApiService`, экспорт `new ApiService()`). Особенность: методы **не пробрасывают ошибки наружу**, а логируют и возвращают безопасный фолбэк (`{ success: false, data: [] }`), чтобы сайт не падал при недоступности/атаке на сервер. Новые вызовы добавляй туда же тем же паттерном. Пути всегда с префиксом `/api/...`.

Состояние — MobX (`mobx-react-lite`, `observer`). Стили — CSS Modules + дизайн-токены (`shared/styles/tokens.css`); MUI/Emotion стоят в зависимостях, но новые блоки верстаются на CSS Modules.

### Карта компонентов (что где лежит)

| Блок сайта | Файл |
|---|---|
| Hero (луч, факты, розовая лента) | `widget/HeroSection/ui/HeroSerction.jsx` (опечатка в имени — так и есть) |
| Шапка/навигация | `widget/Header/ui/Header.jsx` |
| Секция событий | `widget/Events/EventsSection.jsx` |
| Карточка события (+фолбэк без фото) | `features/ExpandableText/ui/EventCard.jsx` |
| Форма «Пробное занятие» | `widget/Forma/ui/Forma.jsx` |
| Карточки команд | `widget/Teams/ui/TeamsCarts.jsx` |
| Отзывы (список, сводка, форма) | `widget/Reviews/ReviewsSection.jsx` |
| Галерея (чипы, группы по месяцам, лайтбокс) | `features/ExpandableText/ui/FilteredPhotos.jsx` |
| Биография, контакты, мастер-классы | `widget/Biography/`, `widget/Contact/`, `widget/MasterCasses/` |
| Пустые состояния | `features/ExpandableText/ui/EmptyEvent.jsx`, `shared/ui/LoadError/` |
| Дизайн-токены и шрифты | `shared/styles/tokens.css`, `shared/styles/fonts.css` (self-hosted variable woff2 в `shared/fonts/`) |

Папка `features/ExpandableText/` исторически содержит разнородные UI-куски (галерея, карточки событий), а не только «раскрывающийся текст».

### Дизайн-система (концепция «Свет на сцене»)

Тёмная сцена `#0a0a0f`, акцент `#7c5cff`, розовый `#ff3d8b` — только лента/чипы «бандана» (единственное место со скосом `skewX`). Шрифты: Unbounded (заголовки, 500–800) + Manrope (текст, 400–700). Правила: **элемент без реального значения скрывается** (не заглушка); максимум 2 бесконечные анимации на экран; `prefers-reduced-motion` отключает анимации. **Фото Марка на главной не размещать** (решение владельца).

### Неочевидное про данные

- `events.event_date` в БД — **STRING**, не DATE (клиент парсит через `new Date`, непарсибельное показывает как есть). У `master_classes.event_date` — DATE.
- Контракт `/api/contact-form`: `{ fullNameAdult, fullNameKid, age, phone, city, message }` → сообщение админам в Telegram. Forma маппит свои поля в этот контракт (telegram-контакт уходит внутри `phone`).
- `gallery` отдаёт `createdAt` (стандартные timestamps) — по нему галерея группирует фото по месяцам; `filter` — категория для чипов.
- В dev-базе файлов `uploads/` нет — картинки битые, это нормально; `EventCard` в этом случае рендерит типографскую карточку с датой.
