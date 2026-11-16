import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./Login.module.css";

export default function Login() {
  const { authenticated, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось войти");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;
  if (authenticated) return <Navigate to="/" replace />;

  return (
    <div className={styles.page}>
      <form className={`card ${styles.card}`} onSubmit={handleSubmit}>
        <div className={styles.brand}>
          <span className="h" style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
            bandana
          </span>
          <span className="badge pink sm">admin</span>
        </div>

        <div>
          <h1 className="h" style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
            Вход
          </h1>
          <p className="muted" style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5 }}>
            По личному email и паролю.
          </p>
        </div>

        <label className="f">
          <span>Email</span>
          <input
            className="inp"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </label>

        <label className="f">
          <span>Пароль</span>
          <div style={{ position: "relative" }}>
            <input
              className="inp"
              style={{ paddingRight: 44 }}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className={styles.togglePassword}
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "Скрыть" : "Показать"}
            </button>
          </div>
        </label>

        <button type="submit" className="btn pri" style={{ minHeight: 48 }} disabled={submitting}>
          {submitting ? "Входим..." : "Войти"}
        </button>

        {error && <p className={styles.error}>{error}</p>}

        <p className={styles.hint}>
          <b>Почему email, а не Telegram:</b> приглашения, сброс пароля и вход работают одинаково
          у любого сотрудника — даже без аккаунта в Telegram.
        </p>
        <div className={styles.footerNote}>
          Нет аккаунта? Попросите владельца студии прислать приглашение из раздела «Доступы».
        </div>
      </form>
    </div>
  );
}
