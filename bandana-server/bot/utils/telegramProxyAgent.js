// Прокси для обхода блокировки Telegram API (RKN и т.п.).
// Тот же источник, что использует zynto-bot: приоритет — env TELEGRAM_PROXY (один URL),
// иначе первая валидная строка из proxies.txt (лежит рядом с этим проектом на сервере,
// это копия файла zynto-bot — единый пул прокси на оба бота).
//
// Форматы строк в proxies.txt (как у провайдеров прокси):
//   host:port:user:pass
//   host:port
//   socks5://user:pass@host:port
//   http://user:pass@host:port
const fs = require("fs");
const path = require("path");

function normalizeProxyLine(raw) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) return "";
  if (line.includes("://")) return line;

  const parts = line.split(":");
  if (parts.length === 2) {
    const [host, port] = parts;
    return `socks5://${host}:${port}`;
  }
  if (parts.length === 4) {
    // Провайдеры прокси в формате host:port:user:pass почти всегда HTTP(S)-прокси
    // (CONNECT), не SOCKS5. Подтверждено эмпирически 2026-08-18: curl --socks5
    // к 45.91.209.155:12366 висит до таймаута, curl -x http:// отвечает мгновенно.
    // Именно из-за ошибочного socks5:// здесь bot.launch() падал по таймауту
    // на ВСЕХ попытках (детерминированно, а не "прокси иногда тупит").
    const [host, port, user, pass] = parts;
    return `http://${user}:${pass}@${host}:${port}`;
  }
  return "";
}

function loadProxies() {
  const env = (process.env.TELEGRAM_PROXY || "").trim();
  if (env) return [env];

  const filePath = path.join(__dirname, "..", "..", "proxies.txt");
  if (!fs.existsSync(filePath)) return [];

  return fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .map(normalizeProxyLine)
    .filter(Boolean);
}

function buildTelegramAgent() {
  const [proxyUrl] = loadProxies();
  if (!proxyUrl) return undefined;

  if (proxyUrl.startsWith("socks")) {
    const { SocksProxyAgent } = require("socks-proxy-agent");
    return new SocksProxyAgent(proxyUrl);
  }
  const { HttpsProxyAgent } = require("https-proxy-agent");
  return new HttpsProxyAgent(proxyUrl);
}

module.exports = { buildTelegramAgent };
