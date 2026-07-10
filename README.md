# bandana — локальный дев-стенд

Два репозитория (`bandana-client`, `bandana-server`) сайта bandana-dance.ru, склонированы сюда для совместной разработки.

## Запуск

### Быстрый старт (одна команда)

```
npm install                          # в корне, один раз
npm install --prefix bandana-server  # один раз
npm install --prefix bandana-client  # один раз
cp bandana-server/.env.example bandana-server/.env   # заполнить BOT_TOKEN и ADMINS_ID
npm run dev
```

Поднимет Postgres в докере и запустит сервер (`:5000`) и клиент (`:3000`) параллельно
в одном терминале (через `concurrently`).

### Вручную (по отдельности)

1. Поднять Postgres:
   ```
   docker compose up -d
   ```
2. Сервер:
   ```
   cd bandana-server
   cp .env.example .env   # заполнить BOT_TOKEN и ADMINS_ID
   npm install
   npm run dev            # http://localhost:5000
   ```
3. Клиент:
   ```
   cd bandana-client
   npm install
   npm start              # http://localhost:3000, ходит на localhost:5000 (см. .env.development)
   ```

CORS сервера читает список разрешённых origin из `CORS_ORIGINS` в `.env`
(по умолчанию уже включает `http://localhost:3000`).

## Продакшн

- Домен: `bandana-dance.ru` (захардкожен как дефолт в `bandana-client/src/shared/api/api.js` и в CORS `bandana-server/index.js`)
- Клиент собирается через `npm run build` и раздаётся статикой/через Nginx
- Сервер запускается через PM2 (`ecosystem.config.js`, `npm run start:pm2`)
