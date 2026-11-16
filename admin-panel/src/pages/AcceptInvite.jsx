import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { inviteApi } from "../api/adminApi";
import { useAuth } from "../context/AuthContext";
import styles from "./Login.module.css";

function passwordStrength(password) {
  if (password.length === 0) return { level: 0, message: "" };
  if (password.length < 10) {
    return {
      level: 1,
      message: `Слишком короткий — добавьте ещё ${10 - password.length} символ(ов): нужно не меньше 10`,
    };
  }
  const variety =
    [/[a-zа-я]/, /[A-ZА-Я]/, /[0-9]/, /[^a-zA-Zа-яА-Я0-9]/].filter((re) => re.test(password))
      .length;
  if (variety >= 3) return { level: 3, message: "Надёжный" };
  return { level: 2, message: "Средний — добавьте цифру или символ" };
}

export default function AcceptInvite() {
  const { token } = useParams();
  const { authenticated, setAdminDirect } = useAuth();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    inviteApi
      .get(token)
      .then((res) => setInvite(res.data))
      .catch((err) => setLoadError(err.response?.data?.message || "Ссылка недействительна"));
  }, [token]);

  if (authenticated) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError("Пароли не совпадают");
      return;
    }
    setSubmitting(true);
    try {
      const res = await inviteApi.accept(token, name, password);
      setAdminDirect(res.admin);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось принять приглашение");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className={styles.page}>
        <div className={`card ${styles.card}`} style={{ textAlign: "center" }}>
          <h1 className="h" style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
            Ссылка недействительна
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {loadError}
          </p>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  const strength = passwordStrength(password);
  const expiresDate = new Date(invite.expiresAt).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });

  return (
    <div className={styles.page}>
      <form className={`card ${styles.card}`} style={{ borderColor: "#2b2546" }} onSubmit={handleSubmit}>
        <div>
          <h1 className="h" style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
            Принять приглашение
          </h1>
          <p className="muted" style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5 }}>
            {invite.invitedByName
              ? `${invite.invitedByName} приглашает вас управлять сайтом bandana-dance.ru.`
              : "Вас приглашают управлять сайтом bandana-dance.ru."}
          </p>
        </div>

        <label className="f">
          <span>Email</span>
          <input className="inp" value={invite.email} readOnly style={{ color: "var(--text-dim)" }} />
        </label>

        <label className="f">
          <span>Как вас подписывать в журнале</span>
          <input
            className="inp"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Имя и фамилия"
            required
          />
        </label>

        <label className="f">
          <span>Придумайте пароль</span>
          <input
            className="inp"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <div
            aria-hidden="true"
            style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4, marginTop: 2 }}
          >
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                style={{
                  height: 4,
                  borderRadius: 2,
                  background:
                    i <= strength.level
                      ? strength.level >= 3
                        ? "var(--success)"
                        : "var(--warning)"
                      : "#22222e",
                }}
              />
            ))}
          </div>
          {strength.message && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: strength.level >= 3 ? "var(--success)" : "var(--warning)",
              }}
            >
              {strength.message}
            </span>
          )}
        </label>

        <label className="f">
          <span>Повторите пароль</span>
          <input
            className="inp"
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className="btn pri" style={{ minHeight: 48 }} disabled={submitting}>
          {submitting ? "Принимаем..." : "Принять и войти"}
        </button>

        <div className={styles.footerNote}>
          Ссылка действует до {expiresDate} и срабатывает один раз. Не ждали письма — просто
          закройте страницу.
        </div>
      </form>
    </div>
  );
}
