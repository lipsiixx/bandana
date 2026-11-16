// bot/helpers/markdown.js
// Эскейпинг пользовательского текста перед вставкой в сообщения с parse_mode: "Markdown".
function escapeMarkdown(text) {
  if (!text) return text;
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

module.exports = { escapeMarkdown };
