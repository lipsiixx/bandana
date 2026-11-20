import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Header from "../widget/Header/ui/Header.jsx";
import ApiService from "../shared/api/api";
import pageStyles from "../shared/styles/page.module.css";
import style from "./Order.module.css";

const FORMAT_FALLBACK = [
  { key: "dance_cut", title: "Dance Cut", description: "" },
  { key: "mix_edit", title: "Mix Edit", description: "" },
  { key: "performance_edit", title: "Performance Edit", description: "" },
  { key: "custom_edit", title: "Custom Edit", description: "" },
];

const STEPS = [
  { key: "format", label: "Формат" },
  { key: "source", label: "Материалы" },
  { key: "duration", label: "Длительность" },
  { key: "brief", label: "Техзадание" },
  { key: "timecodes", label: "Таймкоды" },
  { key: "deadline", label: "Срок" },
  { key: "contact", label: "Контакты" },
  { key: "review", label: "Подтверждение" },
];

const emptyData = {
  format: "",
  sourceFiles: [],
  sourceLinks: [],
  desired_duration: "",
  brief: "",
  comments: "",
  timecodes: [],
  desired_deadline: "",
  contact_name: "",
  contact_telegram: "",
  contact_phone: "",
  contact_email: "",
};

/* Маска телефона: +7 (999) 123-45-67 — как в widget/Forma/ui/Forma.jsx */
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

const Order = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const storageKey = `bandana_order_${slug}`;

  const [service, setService] = useState(null);
  const [serviceLoading, setServiceLoading] = useState(true);
  const [serviceError, setServiceError] = useState(false);

  const [step, setStep] = useState(0);
  const [orderId, setOrderId] = useState(null);
  const [token, setToken] = useState(null);
  const [orderNumber, setOrderNumber] = useState(null);
  const [data, setData] = useState(emptyData);
  const [submitted, setSubmitted] = useState(false);

  const [busy, setBusy] = useState(false);
  const [stepError, setStepError] = useState(null);

  const [fileBusy, setFileBusy] = useState(false);
  const [fileProgress, setFileProgress] = useState(0);
  const [fileError, setFileError] = useState(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkNote, setLinkNote] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = "Оформление заказа — BANDANA";
  }, []);

  useEffect(() => {
    const loadService = async () => {
      setServiceLoading(true);
      setServiceError(false);
      const res = await ApiService.getServiceBySlug(slug);
      if (res?.success && res.data) setService(res.data);
      else setServiceError(true);
      setServiceLoading(false);
    };
    loadService();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Восстановление черновика из sessionStorage (например, после случайного
  // обновления страницы) — подтягиваем свежие данные заказа с сервера,
  // не доверяя локальному состоянию.
  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (!saved) return;
    let parsed;
    try {
      parsed = JSON.parse(saved);
    } catch {
      return;
    }
    if (!parsed?.orderId || !parsed?.token) return;

    (async () => {
      const res = await ApiService.getOrderStatus(parsed.token);
      if (!res?.success || !res.data) return;
      const o = res.data.order;
      if (o.status !== "new") {
        navigate(`/order/${parsed.token}`);
        return;
      }
      setOrderId(parsed.orderId);
      setToken(parsed.token);
      setOrderNumber(o.orderNumber);
      setData((prev) => ({
        ...prev,
        format: o.format || "",
        sourceLinks: o.sourceLinks || [],
        desired_duration: o.desiredDuration || "",
        brief: o.brief || "",
        comments: o.comments || "",
        timecodes: o.timecodes || [],
        desired_deadline: o.desiredDeadline ? o.desiredDeadline.slice(0, 10) : "",
        contact_name: o.contactName || "",
        contact_telegram: o.contactTelegram || "",
        contact_phone: o.contactPhone || "",
        contact_email: o.contactEmail || "",
        sourceFiles: (res.data.files || []).map((f) => ({ id: f.id, fileName: f.fileName })),
      }));
      if (o.format) setStep(1);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (name, value) => setData((prev) => ({ ...prev, [name]: value }));

  async function saveAndNext(fields) {
    setBusy(true);
    setStepError(null);
    const res = await ApiService.patchOrder(orderId, token, fields);
    setBusy(false);
    if (!res?.success) {
      setStepError(res?.message || "Не удалось сохранить");
      return;
    }
    setStep((s) => s + 1);
  }

  async function handleFormatNext() {
    if (!data.format) {
      setStepError("Выберите формат");
      return;
    }
    setBusy(true);
    setStepError(null);
    let res;
    if (!orderId) {
      res = await ApiService.createOrder({ serviceSlug: slug, format: data.format });
      if (res?.success) {
        setOrderId(res.data.orderId);
        setToken(res.data.token);
        setOrderNumber(res.data.orderNumber);
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ orderId: res.data.orderId, token: res.data.token }),
        );
      }
    } else {
      res = await ApiService.patchOrder(orderId, token, { format: data.format });
    }
    setBusy(false);
    if (!res?.success) {
      setStepError(res?.message || "Не удалось создать заказ");
      return;
    }
    setStep(1);
  }

  async function handleContactNext() {
    const name = data.contact_name.trim();
    if (!name) {
      setStepError("Укажите имя");
      return;
    }
    if (!data.contact_telegram.trim() && !data.contact_phone.trim() && !data.contact_email.trim()) {
      setStepError("Укажите хотя бы один способ связи");
      return;
    }
    await saveAndNext({
      contact_name: name,
      contact_telegram: data.contact_telegram.trim(),
      contact_phone: data.contact_phone.trim(),
      contact_email: data.contact_email.trim(),
    });
  }

  async function handleFinalize() {
    setBusy(true);
    setStepError(null);
    const res = await ApiService.patchOrder(orderId, token, { finalize: true });
    setBusy(false);
    if (!res?.success) {
      setStepError(res?.message || "Не удалось отправить заказ");
      return;
    }
    sessionStorage.removeItem(storageKey);
    setSubmitted(true);
  }

  function handleNext() {
    if (step === 0) return handleFormatNext();
    if (step === 1) return setStep(2);
    if (step === 2) return saveAndNext({ desired_duration: data.desired_duration });
    if (step === 3) return saveAndNext({ brief: data.brief, comments: data.comments });
    if (step === 4) return saveAndNext({ timecodes: data.timecodes });
    if (step === 5) return saveAndNext({ desired_deadline: data.desired_deadline || null });
    if (step === 6) return handleContactNext();
    if (step === 7) return handleFinalize();
  }

  function handleBack() {
    setStepError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  // В одностроковых полях Enter логично продолжает визард/добавляет
  // элемент — иначе приходится каждый раз тянуться мышкой к кнопке.
  function handleEnterAdvance(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNext();
    }
  }
  function handleEnterAddLink(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddLink();
    }
  }

  async function handleFilesSelected(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setFileBusy(true);
    setFileError(null);
    setFileProgress(0);
    const res = await ApiService.uploadOrderFiles(orderId, token, files, setFileProgress);
    setFileBusy(false);
    if (res?.success) {
      setData((prev) => ({
        ...prev,
        sourceFiles: [...prev.sourceFiles, ...res.data.map((f) => ({ id: f.id, fileName: f.fileName }))],
      }));
    } else {
      setFileError(res?.message || "Не удалось загрузить файл(ы)");
    }
  }

  async function handleAddLink() {
    if (!linkUrl.trim()) return;
    setBusy(true);
    setStepError(null);
    const res = await ApiService.addOrderLink(orderId, token, linkUrl.trim(), linkNote.trim());
    setBusy(false);
    if (res?.success) {
      setData((prev) => ({ ...prev, sourceLinks: res.data }));
      setLinkUrl("");
      setLinkNote("");
    } else {
      setStepError(res?.message || "Не удалось добавить ссылку");
    }
  }

  function addTimecodeRow() {
    setData((prev) => ({ ...prev, timecodes: [...prev.timecodes, { moment: "", note: "" }] }));
  }
  function updateTimecodeRow(i, field, value) {
    setData((prev) => {
      const next = [...prev.timecodes];
      next[i] = { ...next[i], [field]: value };
      return { ...prev, timecodes: next };
    });
  }
  function removeTimecodeRow(i) {
    setData((prev) => ({ ...prev, timecodes: prev.timecodes.filter((_, idx) => idx !== i) }));
  }

  async function copyLink() {
    const url = `${window.location.origin}/order/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // буфер недоступен — ссылка всё равно видна на экране и кликабельна
    }
  }

  if (serviceLoading) {
    return (
      <div>
        <Header />
        <main className={pageStyles.page}>
          <div className={pageStyles.inner}>
            <div className={style.skeleton} />
          </div>
        </main>
      </div>
    );
  }

  if (serviceError || !service) {
    return (
      <div>
        <Header />
        <main className={pageStyles.page}>
          <div className={pageStyles.inner}>
            <p>Не удалось загрузить услугу.</p>
            <Link to="/services" className={style.backLink}>
              ← Вернуться в каталог услуг
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (service.status !== "active") {
    return (
      <div>
        <Header />
        <main className={pageStyles.page}>
          <div className={pageStyles.inner}>
            <p>Эта услуга пока не принимает заказы.</p>
            <Link to="/services" className={style.backLink}>
              ← Вернуться в каталог услуг
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (submitted) {
    const url = `${window.location.origin}/order/${token}`;
    return (
      <div>
        <Header />
        <main className={pageStyles.page}>
          <div className={pageStyles.inner}>
            <div className={style.success}>
              <div className={style.successIcon} aria-hidden="true">✓</div>
              <h2 className={style.successTitle}>Заявка отправлена</h2>
              <p className={style.successText}>
                Номер заказа: <strong>{orderNumber}</strong>. Сохраните ссылку ниже — по ней можно
                следить за статусом, переписываться и получить готовый файл.
              </p>
              <div className={style.linkRow}>
                <input className={style.linkInput} readOnly value={url} onFocus={(e) => e.target.select()} />
                <button type="button" className={style.copyBtn} onClick={copyLink}>
                  {copied ? "Скопировано" : "Скопировать"}
                </button>
              </div>
              <Link to={`/order/${token}`} className={style.statusLink}>
                Открыть страницу заказа →
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const formats = service.detail?.formats?.length ? service.detail.formats : FORMAT_FALLBACK;

  return (
    <div>
      <Header />
      <main className={pageStyles.page}>
        <div className={pageStyles.inner}>
          <p className="bd-overline">{service.title}</p>
          <h1 className={style.title}>Оформление заказа</h1>
          <Link to={`/services/${slug}`} className={style.cancelLink}>
            ← Отмена, вернуться к услуге
          </Link>

          <div className={style.stepsBar} aria-label={`Шаг ${step + 1} из ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <span
                key={s.key}
                className={i === step ? style.stepDotOn : i < step ? style.stepDotDone : style.stepDot}
              />
            ))}
          </div>
          <p className={style.stepLabel}>
            Шаг {step + 1} из {STEPS.length}: {STEPS[step].label}
          </p>

          <div className={style.card}>
            {step === 0 && (
              <div className={style.field}>
                <label className={style.label}>Выберите формат</label>
                <div className={style.formatOptions}>
                  {formats.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      className={data.format === f.key ? style.formatOn : style.formatOff}
                      aria-pressed={data.format === f.key}
                      onClick={() => setField("format", f.key)}
                    >
                      <span className={style.formatOptTitle}>{f.title}</span>
                      {f.description && <span className={style.formatOptDesc}>{f.description}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className={style.field}>
                <label className={style.label}>Исходные аудиофайлы</label>
                {data.sourceFiles.length > 0 && (
                  <ul className={style.fileList}>
                    {data.sourceFiles.map((f) => (
                      <li key={f.id}>🎵 {f.fileName}</li>
                    ))}
                  </ul>
                )}
                <input
                  type="file"
                  className={style.fileInput}
                  accept="audio/*"
                  multiple
                  disabled={fileBusy}
                  onChange={(e) => {
                    handleFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />
                {fileBusy && <p className={style.hint}>Загрузка... {fileProgress}%</p>}
                {fileError && <p className={style.error}>{fileError}</p>}
                <p className={style.hint}>mp3, wav, m4a, aac, ogg, flac — до 300 МБ на файл</p>

                <label className={style.label} style={{ marginTop: "var(--sp-6)" }}>
                  Или добавьте ссылку на исходник
                </label>
                {data.sourceLinks.length > 0 && (
                  <ul className={style.fileList}>
                    {data.sourceLinks.map((l, i) => (
                      <li key={i}>
                        🔗 {l.url} {l.note && `— ${l.note}`}
                      </li>
                    ))}
                  </ul>
                )}
                <div className={style.linkAddRow}>
                  <input
                    className={style.input}
                    placeholder="https://…"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={handleEnterAddLink}
                  />
                  <input
                    className={style.input}
                    placeholder="Комментарий (необязательно)"
                    value={linkNote}
                    onChange={(e) => setLinkNote(e.target.value)}
                    onKeyDown={handleEnterAddLink}
                  />
                  <button type="button" className={style.addBtn} onClick={handleAddLink} disabled={busy}>
                    Добавить
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className={style.field}>
                <label className={style.label} htmlFor="duration">
                  Желаемая длительность трека
                </label>
                <input
                  id="duration"
                  className={style.input}
                  placeholder="Например, 2:30 или «60–90 секунд»"
                  value={data.desired_duration}
                  onChange={(e) => setField("desired_duration", e.target.value)}
                  onKeyDown={handleEnterAdvance}
                />
              </div>
            )}

            {step === 3 && (
              <div className={style.field}>
                <label className={style.label} htmlFor="brief">
                  Техническое задание
                </label>
                <textarea
                  id="brief"
                  className={`${style.input} ${style.textarea}`}
                  placeholder="Что должно получиться, под какой номер/выступление"
                  value={data.brief}
                  onChange={(e) => setField("brief", e.target.value)}
                />
                <label className={style.label} style={{ marginTop: "var(--sp-4)" }} htmlFor="comments">
                  Комментарии
                </label>
                <textarea
                  id="comments"
                  className={`${style.input} ${style.textarea}`}
                  placeholder="Любые дополнительные пожелания"
                  value={data.comments}
                  onChange={(e) => setField("comments", e.target.value)}
                />
              </div>
            )}

            {step === 4 && (
              <div className={style.field}>
                <label className={style.label}>Таймкоды — моменты и акценты</label>
                {data.timecodes.map((t, i) => (
                  <div key={i} className={style.timecodeRow}>
                    <input
                      className={`${style.input} ${style.timecodeMoment}`}
                      placeholder="0:45"
                      value={t.moment}
                      onChange={(e) => updateTimecodeRow(i, "moment", e.target.value)}
                    />
                    <input
                      className={style.input}
                      placeholder="Что должно произойти в этот момент"
                      value={t.note}
                      onChange={(e) => updateTimecodeRow(i, "note", e.target.value)}
                    />
                    <button
                      type="button"
                      className={style.removeBtn}
                      aria-label="Удалить строку"
                      onClick={() => removeTimecodeRow(i)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button type="button" className={style.addQuestion} onClick={addTimecodeRow}>
                  + Добавить таймкод
                </button>
              </div>
            )}

            {step === 5 && (
              <div className={style.field}>
                <label className={style.label} htmlFor="deadline">
                  Желаемый срок выполнения
                </label>
                <input
                  id="deadline"
                  type="date"
                  className={style.input}
                  value={data.desired_deadline}
                  onChange={(e) => setField("desired_deadline", e.target.value)}
                />
              </div>
            )}

            {step === 6 && (
              <div className={style.field}>
                <label className={style.label} htmlFor="contact_name">
                  Ваше имя
                </label>
                <input
                  id="contact_name"
                  className={style.input}
                  value={data.contact_name}
                  onChange={(e) => setField("contact_name", e.target.value)}
                  onKeyDown={handleEnterAdvance}
                />
                <label className={style.label} style={{ marginTop: "var(--sp-4)" }} htmlFor="contact_telegram">
                  Telegram
                </label>
                <input
                  id="contact_telegram"
                  className={style.input}
                  placeholder="@ник или t.me/…"
                  value={data.contact_telegram}
                  onChange={(e) => setField("contact_telegram", e.target.value)}
                  onKeyDown={handleEnterAdvance}
                />
                <label className={style.label} style={{ marginTop: "var(--sp-4)" }} htmlFor="contact_phone">
                  Телефон
                </label>
                <input
                  id="contact_phone"
                  className={style.input}
                  type="tel"
                  placeholder="+7 (___) ___-__-__"
                  value={data.contact_phone}
                  onChange={(e) => setField("contact_phone", formatPhone(e.target.value))}
                  onKeyDown={handleEnterAdvance}
                />
                <label className={style.label} style={{ marginTop: "var(--sp-4)" }} htmlFor="contact_email">
                  Email
                </label>
                <input
                  id="contact_email"
                  className={style.input}
                  type="email"
                  value={data.contact_email}
                  onChange={(e) => setField("contact_email", e.target.value)}
                  onKeyDown={handleEnterAdvance}
                />
                <p className={style.hint}>Укажите хотя бы один способ связи</p>
              </div>
            )}

            {step === 7 && (
              <div className={style.field}>
                <label className={style.label}>Проверьте данные перед отправкой</label>
                <dl className={style.summary}>
                  <dt>Формат</dt>
                  <dd>{formats.find((f) => f.key === data.format)?.title || data.format}</dd>
                  <dt>Материалы</dt>
                  <dd>
                    {data.sourceFiles.length === 0 && data.sourceLinks.length === 0
                      ? "не загружены"
                      : `${data.sourceFiles.length} файл(ов), ${data.sourceLinks.length} ссылк(а/и)`}
                  </dd>
                  <dt>Длительность</dt>
                  <dd>{data.desired_duration || "—"}</dd>
                  <dt>Техзадание</dt>
                  <dd>{data.brief || "—"}</dd>
                  <dt>Таймкодов</dt>
                  <dd>{data.timecodes.length}</dd>
                  <dt>Срок</dt>
                  <dd>{data.desired_deadline || "не указан"}</dd>
                  <dt>Контакт</dt>
                  <dd>
                    {data.contact_name}
                    {data.contact_telegram && ` · ${data.contact_telegram}`}
                    {data.contact_phone && ` · ${data.contact_phone}`}
                    {data.contact_email && ` · ${data.contact_email}`}
                  </dd>
                </dl>
              </div>
            )}

            {stepError && <p className={style.error}>{stepError}</p>}

            <div className={style.navRow}>
              <button type="button" className={style.backBtn} onClick={handleBack} disabled={step === 0 || busy}>
                Назад
              </button>
              <button type="button" className={style.nextBtn} onClick={handleNext} disabled={busy}>
                {busy ? "Сохраняем…" : step === 7 ? "Отправить заказ" : "Далее"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Order;
