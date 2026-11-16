import React, { useRef, useState } from "react";
import styles from "./Forma.module.css";
import ApiService from "../../../shared/api/api";

const TELEGRAM_URL = "https://t.me/dancerinbandana";

const AGES = Array.from({ length: 14 }, (_, i) => i + 4); // 4–17

const ageLabel = (n) => (n === 4 ? "4 года" : `${n} лет`);

/* Маска телефона: +7 (999) 123-45-67 */
const formatPhone = (raw) => {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("8")) d = "7" + d.slice(1);
  if (!d.startsWith("7")) d = "7" + d;
  d = d.slice(0, 11);
  const p = d.slice(1);
  let out = "+7";
  if (p.length > 0) out += " (" + p.slice(0, 3);
  if (p.length >= 3) out += ") " + p.slice(3, 6);
  if (p.length >= 6) out += "-" + p.slice(6, 8);
  if (p.length >= 8) out += "-" + p.slice(8, 10);
  return out;
};

const STEPS = [
  "Созваниваемся и выбираем группу или мастер-класс",
  "Первое занятие — знакомство, подготовка не нужна, только удобная обувь",
  "Дальше — команда и сцена, если захочется",
];

const Forma = () => {
  const [who, setWho] = useState("child"); // child | self
  const [contactMode, setContactMode] = useState("phone"); // phone | telegram
  const [form, setForm] = useState({
    childName: "",
    age: "",
    name: "",
    phone: "",
    telegram: "",
    question: "",
  });
  const [consent, setConsent] = useState(false);
  const [askQuestion, setAskQuestion] = useState(false);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const fieldRefs = {
    childName: useRef(null),
    age: useRef(null),
    name: useRef(null),
    contact: useRef(null),
    consent: useRef(null),
  };

  const setField = (name, value) =>
    setForm((f) => ({ ...f, [name]: value }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setField(name, name === "phone" ? formatPhone(value) : value);
  };

  /* Валидация одного поля — по уходу из поля и при отправке */
  const validateField = (name) => {
    switch (name) {
      case "childName":
        return who === "child" && !form.childName.trim()
          ? "Напишите имя ребёнка"
          : "";
      case "age":
        return who === "child" && !form.age ? "Выберите возраст" : "";
      case "name":
        return !form.name.trim() ? "Напишите ваше имя" : "";
      case "contact":
        if (contactMode === "phone") {
          return form.phone.replace(/\D/g, "").length === 11
            ? ""
            : "Введите телефон полностью";
        }
        return form.telegram.trim() ? "" : "Укажите ник или ссылку t.me/…";
      case "consent":
        return consent ? "" : "Нужно согласие, чтобы я мог перезвонить";
      default:
        return "";
    }
  };

  const handleBlur = (name) => {
    setErrors((prev) => ({ ...prev, [name]: validateField(name) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const names = ["childName", "age", "name", "contact", "consent"];
    const next = {};
    names.forEach((n) => {
      const msg = validateField(n);
      if (msg) next[n] = msg;
    });
    setErrors(next);
    const firstInvalid = names.find((n) => next[n]);
    if (firstInvalid) {
      fieldRefs[firstInvalid].current?.focus();
      return;
    }

    setStatus("sending");
    const payload = {
      fullNameAdult: form.name.trim(),
      fullNameKid: who === "child" ? form.childName.trim() : "занимается сам(а)",
      age: who === "child" ? form.age : "взрослый",
      phone:
        contactMode === "phone"
          ? form.phone
          : `${form.telegram.trim()} (Telegram)`,
      city: "не указан",
      message: form.question.trim(),
    };
    const res = await ApiService.postContact(payload);
    setStatus(res && res.success ? "success" : "error");
  };

  if (status === "success") {
    return (
      <div className={styles.wrap}>
        <div className={styles.success}>
          <div className={styles.successIcon} aria-hidden="true">✓</div>
          <h3 className={styles.successTitle}>Заявка у меня</h3>
          <p className={styles.successText}>
            Перезвоню в течение дня. А пока — анонсы и видео в Telegram-канале.
          </p>
          <a
            href={TELEGRAM_URL}
            className={styles.successBtn}
            target="_blank"
            rel="noopener noreferrer"
          >
            Открыть канал
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.intro}>
        <p className="bd-overline">Первый шаг</p>
        <h2 className={styles.title}>Пробное занятие</h2>
        <p className={styles.subtitle}>
          Оставьте контакт — перезвоню и подберу группу по возрасту и уровню.
        </p>

        <ol className={styles.steps}>
          {STEPS.map((text, i) => (
            <li key={i} className={styles.step}>
              <span className={styles.stepNum} aria-hidden="true">
                0{i + 1}
              </span>
              {text}
            </li>
          ))}
        </ol>

        <p className={styles.tgHint}>
          Удобнее переписываться?{" "}
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
            Написать в Telegram
          </a>
        </p>
      </div>

      <form id="forma" className={styles.forma} onSubmit={handleSubmit} noValidate>
        <fieldset className={styles.group}>
          <legend className={styles.label}>Кто будет заниматься</legend>
          <div className={styles.segment} role="radiogroup">
            <button
              type="button"
              className={who === "child" ? styles.segmentOn : styles.segmentOff}
              aria-pressed={who === "child"}
              onClick={() => setWho("child")}
            >
              Ребёнок
            </button>
            <button
              type="button"
              className={who === "self" ? styles.segmentOn : styles.segmentOff}
              aria-pressed={who === "self"}
              onClick={() => setWho("self")}
            >
              Я сам(а)
            </button>
          </div>
        </fieldset>

        {who === "child" && (
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="childName">Имя ребёнка</label>
              <input
                ref={fieldRefs.childName}
                id="childName"
                className={styles.input}
                type="text"
                name="childName"
                value={form.childName}
                onChange={handleChange}
                onBlur={() => handleBlur("childName")}
                aria-invalid={!!errors.childName}
              />
              {errors.childName && <p className={styles.error}>{errors.childName}</p>}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="age">Возраст</label>
              <select
                ref={fieldRefs.age}
                id="age"
                className={styles.input}
                name="age"
                value={form.age}
                onChange={handleChange}
                onBlur={() => handleBlur("age")}
                aria-invalid={!!errors.age}
              >
                <option value="" disabled hidden></option>
                {AGES.map((n) => (
                  <option key={n} value={ageLabel(n)}>{ageLabel(n)}</option>
                ))}
              </select>
              {errors.age && <p className={styles.error}>{errors.age}</p>}
            </div>
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="name">Ваше имя</label>
          <input
            ref={fieldRefs.name}
            id="name"
            className={styles.input}
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            onBlur={() => handleBlur("name")}
            autoComplete="name"
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className={styles.error}>{errors.name}</p>}
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Как с вами связаться</span>
          <div className={styles.contactRow}>
            <div className={styles.segment} role="radiogroup">
              <button
                type="button"
                className={contactMode === "phone" ? styles.segmentOn : styles.segmentOff}
                aria-pressed={contactMode === "phone"}
                onClick={() => setContactMode("phone")}
              >
                Телефон
              </button>
              <button
                type="button"
                className={contactMode === "telegram" ? styles.segmentOn : styles.segmentOff}
                aria-pressed={contactMode === "telegram"}
                onClick={() => setContactMode("telegram")}
              >
                Telegram
              </button>
            </div>
            {contactMode === "phone" ? (
              <input
                ref={fieldRefs.contact}
                className={styles.input}
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                onBlur={() => handleBlur("contact")}
                placeholder="+7 (___) ___-__-__"
                inputMode="tel"
                autoComplete="tel"
                aria-label="Телефон"
                aria-invalid={!!errors.contact}
              />
            ) : (
              /* Маски нет: принимаем @ник или ссылку t.me/… */
              <input
                ref={fieldRefs.contact}
                className={styles.input}
                type="text"
                name="telegram"
                value={form.telegram}
                onChange={handleChange}
                onBlur={() => handleBlur("contact")}
                placeholder="@ник или t.me/…"
                autoComplete="off"
                aria-label="Ник в Telegram"
                aria-invalid={!!errors.contact}
              />
            )}
          </div>
          {errors.contact && <p className={styles.error}>{errors.contact}</p>}
        </div>

        {askQuestion ? (
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            name="question"
            value={form.question}
            onChange={handleChange}
            placeholder="Ваш вопрос"
            autoFocus
          />
        ) : (
          <button
            type="button"
            className={styles.addQuestion}
            onClick={() => setAskQuestion(true)}
          >
            + Добавить вопрос
          </button>
        )}

        <label className={styles.consent}>
          <input
            ref={fieldRefs.consent}
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              if (e.target.checked) {
                setErrors((prev) => ({ ...prev, consent: "" }));
              }
            }}
          />
          <span>
            Согласен(на) на обработку персональных данных —{" "}
            <a href="/policy.html" target="_blank" rel="noopener noreferrer">
              политика
            </a>
          </span>
        </label>
        {errors.consent && <p className={styles.error}>{errors.consent}</p>}

        {status === "error" && (
          <div className={styles.fail} role="alert">
            <p className={styles.failTitle}>Не получилось отправить</p>
            <p className={styles.failText}>
              Сервер сейчас не отвечает. Всё, что вы ввели, сохранилось —
              попробуйте ещё раз или напишите мне в Telegram, отвечу там.
            </p>
            <a
              href={TELEGRAM_URL}
              className={styles.failBtn}
              target="_blank"
              rel="noopener noreferrer"
            >
              Написать в Telegram
            </a>
          </div>
        )}

        <button type="submit" className={styles.submit} disabled={status === "sending"}>
          {status === "sending"
            ? "Отправляем…"
            : status === "error"
              ? "Отправить ещё раз"
              : "Записаться на пробное"}
        </button>
      </form>
    </div>
  );
};

export default Forma;
