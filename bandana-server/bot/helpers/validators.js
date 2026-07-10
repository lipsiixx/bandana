// bot/helpers/validators.js
function validateDescription(text) {
  if (!text || !text.trim()) {
    return {
      ok: false,
      message:
        "❌ Описание не может быть пустым.\n\nПример: «Летний фестиваль уличных танцев — яркое шоу на открытой площадке»",
    };
  }
  if (text.trim().length < 10) {
    return {
      ok: false,
      message:
        "❌ Описание слишком короткое (минимум 10 символов).\n\nПример: «Городской танцевальный батл»",
    };
  }
  if (text.trim().length > 1000) {
    return {
      ok: false,
      message:
        "❌ Описание слишком длинное (максимум 1000 символов). Сократи текст.",
    };
  }
  return { ok: true };
}

function validateEventDate(text) {
  if (!text || !text.trim()) {
    return {
      ok: false,
      message: "❌ Дата не может быть пустой.\n\nПример: «25.06.2025»",
    };
  }
  const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
  if (!dateRegex.test(text.trim())) {
    return {
      ok: false,
      message:
        "❌ Неверный формат даты.\n\nПример: «25.06.2025» (день.месяц.год)",
    };
  }
  // Проверяем что дата реальная
  const [day, month, year] = text.trim().split(".").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return {
      ok: false,
      message: "❌ Такой даты не существует.\n\nПример: «25.06.2025»",
    };
  }
  return { ok: true };
}

function validatePlace(text) {
  if (!text || !text.trim()) {
    return {
      ok: false,
      message:
        "❌ Место не может быть пустым.\n\nПример: «Москва, Парк Горького, главная сцена»",
    };
  }
  if (text.trim().length < 3) {
    return {
      ok: false,
      message:
        "❌ Слишком короткое название места (минимум 3 символа).\n\nПример: «СПб, Дворцовая площадь»",
    };
  }
  return { ok: true };
}

function validateGalleryFilter(text) {
  if (!text || !text.trim()) {
    return {
      ok: false,
      message:
        "❌ Фильтр не может быть пустым.\n\nПример: «summer», «retro», «black&white»",
    };
  }
  if (text.trim().length > 50) {
    return {
      ok: false,
      message: "❌ Название фильтра слишком длинное (максимум 50 символов).",
    };
  }
  return { ok: true };
}

function validateGalleryFooter(text) {
  if (!text || !text.trim()) {
    return {
      ok: false,
      message:
        "❌ Подпись не может быть пустой.\n\nПример: «Фестиваль Break Dance 2025»",
    };
  }
  if (text.trim().length > 200) {
    return {
      ok: false,
      message:
        "❌ Подпись слишком длинная (максимум 200 символов). Сократи текст.",
    };
  }
  return { ok: true };
}

function validateTeamName(text) {
  if (!text || !text.trim()) {
    return {
      ok: false,
      message:
        "❌ Название команды не может быть пустым.\n\nПример: «Flamingo Dance Crew»",
    };
  }
  if (text.trim().length < 2) {
    return {
      ok: false,
      message:
        "❌ Название слишком короткое (минимум 2 символа).\n\nПример: «Storm»",
    };
  }
  if (text.trim().length > 100) {
    return {
      ok: false,
      message: "❌ Название слишком длинное (максимум 100 символов).",
    };
  }
  return { ok: true };
}

function validateTeamCity(text) {
  if (!text || !text.trim()) {
    return {
      ok: false,
      message: "❌ Город не может быть пустым.\n\nПример: «Москва»",
    };
  }
  if (text.trim().length < 2) {
    return {
      ok: false,
      message: "❌ Название города слишком короткое.\n\nПример: «Уфа»",
    };
  }
  return { ok: true };
}

function validateTeamAgeRange(text) {
  if (!text || !text.trim()) {
    return {
      ok: false,
      message:
        "❌ Возраст не может быть пустым.\n\nПример: «8–14 лет» или «18+»",
    };
  }
  return { ok: true };
}

function validateTeamInstructors(text) {
  if (!text || !text.trim()) {
    return {
      ok: false,
      message:
        "❌ Укажи преподавателей.\n\nПример: «Иванова А.В., Петров С.Н.»",
    };
  }
  return { ok: true };
}

function validateTeamAchievements(text) {
  if (!text || !text.trim()) {
    return {
      ok: false,
      message:
        "❌ Достижения не могут быть пустыми.\n\nПример: «1 место на городском чемпионате 2024; призёры регионального фестиваля»\n\nПеречисляй через точку с запятой (;)",
    };
  }
  return { ok: true };
}

function validateTeamDescription(text) {
  if (!text || !text.trim()) {
    return {
      ok: false,
      message:
        "❌ Описание не может быть пустым.\n\nПример: «Молодёжная команда Hip-Hop направления, основана в 2018 году»",
    };
  }
  if (text.trim().length < 10) {
    return {
      ok: false,
      message:
        "❌ Описание слишком короткое (минимум 10 символов).\n\nПример: «Танцевальная студия для детей от 6 лет»",
    };
  }
  return { ok: true };
}

function validateVideoUrl(text) {
  if (!text || !text.trim()) {
    return {
      ok: false,
      message:
        "❌ Ссылка не может быть пустой.\n\nПример: «https://disk.yandex.ru/i/abcdef123»",
    };
  }
  if (!text.trim().startsWith("https://")) {
    return {
      ok: false,
      message:
        "❌ Ссылка должна начинаться с https://\n\nПример: «https://disk.yandex.ru/i/abcdef123»",
    };
  }
  if (!text.trim().includes("yandex")) {
    return {
      ok: false,
      message:
        "❌ Принимаются только ссылки с Яндекс.Диска.\n\nПример: «https://disk.yandex.ru/i/abcdef123»",
    };
  }
  return { ok: true };
}

function validateVideoName(text) {
  if (!text || !text.trim()) {
    return {
      ok: false,
      message:
        "❌ Название не может быть пустым.\n\nПример: «Выступление на фестивале лето 2025»",
    };
  }
  if (text.trim().length < 3) {
    return {
      ok: false,
      message:
        "❌ Название слишком короткое (минимум 3 символа).\n\nПример: «Батл финал»",
    };
  }
  if (text.trim().length > 200) {
    return {
      ok: false,
      message: "❌ Название слишком длинное (максимум 200 символов).",
    };
  }
  return { ok: true };
}

function validateMasterClassName(text) {
  if (!text || !text.trim()) {
    return {
      ok: false,
      message:
        "❌ Название не может быть пустым.\n\nПример: «Hip-Hop для начинающих»",
    };
  }
  if (text.trim().length < 2) {
    return {
      ok: false,
      message:
        "❌ Название слишком короткое (минимум 2 символа).\n\nПример: «Waacking basics»",
    };
  }
  if (text.trim().length > 200) {
    return {
      ok: false,
      message: "❌ Название слишком длинное (максимум 200 символов).",
    };
  }
  return { ok: true };
}

function validateMasterClassLink(text) {
  if (!text || !text.trim()) {
    return {
      ok: false,
      message:
        "❌ Ссылка не может быть пустой.\n\nПример: «https://t.me/bandana_reg»",
    };
  }
  if (!text.trim().startsWith("http")) {
    return {
      ok: false,
      message:
        "❌ Ссылка должна начинаться с http:// или https://\n\nПример: «https://forms.yandex.ru/survey/abc»",
    };
  }
  return { ok: true };
}

function validateMasterClassDate(text) {
  if (!text || !text.trim()) {
    return {
      ok: false,
      message:
        "❌ Дата не может быть пустой.\n\nФормат: ГГГГ-ММ-ДД\nПример: «2025-06-25»\n\nИли отправь /skip если дата не нужна.",
    };
  }
  if (text.trim().toLowerCase() === "/skip") {
    return { ok: true, skip: true };
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(text.trim())) {
    return {
      ok: false,
      message:
        "❌ Неверный формат даты.\n\nФормат: ГГГГ-ММ-ДД\nПример: «2025-06-25»\n\nИли отправь /skip если дата не нужна.",
    };
  }
  const date = new Date(text.trim());
  if (isNaN(date.getTime())) {
    return {
      ok: false,
      message: "❌ Такой даты не существует.\n\nПример: «2025-06-25»",
    };
  }
  return { ok: true };
}

module.exports = {
  validateDescription,
  validateEventDate,
  validatePlace,
  validateGalleryFilter,
  validateGalleryFooter,
  validateTeamName,
  validateTeamCity,
  validateTeamAgeRange,
  validateTeamInstructors,
  validateTeamAchievements,
  validateTeamDescription,
  validateVideoUrl,
  validateVideoName,
  validateMasterClassName,
  validateMasterClassLink,
  validateMasterClassDate,
};
