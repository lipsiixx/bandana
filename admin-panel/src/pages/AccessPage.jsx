import { useEffect, useState } from "react";
import { accountsApi } from "../api/adminApi";
import { useAuth } from "../context/AuthContext";
import styles from "./AccessPage.module.css";

function initials(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

export default function AccessPage() {
  const { admin } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [createdInvite, setCreatedInvite] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const res = await accountsApi.list();
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось загрузить доступы");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleInvite(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await accountsApi.invite(inviteEmail);
      setCreatedInvite(res.data);
      setInviteEmail("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось создать приглашение");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(id) {
    await accountsApi.revokeInvite(id);
    await load();
  }

  async function handleRemove(id) {
    if (!window.confirm("Закрыть доступ этому аккаунту?")) return;
    await accountsApi.remove(id);
    await load();
  }

  if (!data) return null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className="h" style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>
            Доступы
          </h1>
          <div className="muted" style={{ fontSize: 14, marginTop: 8 }}>
            Кто может входить в админку. Все аккаунты — админы с полным доступом.
          </div>
        </div>
        <button className="btn pri" onClick={() => setInviteOpen(true)}>
          Пригласить
        </button>
      </header>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.body}>
        <div className={styles.main}>
          <section className="card" style={{ overflow: "hidden" }}>
            <div className={styles.sectionHead}>
              <h2 className="h" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                Аккаунты
              </h2>
              <span className="muted" style={{ fontSize: 13 }}>
                {data.users.length} ·{" "}
                {data.pendingInvites.length > 0
                  ? `${data.pendingInvites.length} приглашение(й) ждёт`
                  : "все приняли приглашение"}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 560 }}>
                {data.users.map((user) => (
                  <div className="trow" key={user.id}>
                    <div className={styles.who}>
                      <span className={styles.avatar}>{initials(user.name)}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>
                          {user.name} {user.id === admin.id && <span className="muted">(вы)</span>}
                        </div>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <span className="muted" style={{ flex: "1.3", fontSize: 13 }}>
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleString("ru-RU")
                        : "ещё не входил"}
                    </span>
                    <span className={styles.actionsCol}>
                      {user.id !== admin.id && (
                        <button className="btn" style={{ minHeight: 36 }} onClick={() => handleRemove(user.id)}>
                          Закрыть доступ
                        </button>
                      )}
                    </span>
                  </div>
                ))}
                {data.pendingInvites.map((inv) => (
                  <div className="trow" key={inv.id}>
                    <div className={styles.who}>
                      <span className={styles.avatarPending}>?</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{inv.email}</div>
                        <div className="muted" style={{ fontSize: 13 }}>
                          приглашение до {new Date(inv.expiresAt).toLocaleDateString("ru-RU")}
                        </div>
                      </div>
                    </div>
                    <span style={{ flex: "1.3" }}>
                      <span className="badge warning">ещё не принял</span>
                    </span>
                    <span className={styles.actionsCol}>
                      <button className="btn dng" style={{ minHeight: 36 }} onClick={() => handleRevoke(inv.id)}>
                        Отозвать
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {inviteOpen && (
          <aside className="card" style={{ flex: "1 1 340px", minWidth: 0, padding: 22, display: "flex", flexDirection: "column", gap: 16, borderColor: "#2b2546" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <h2 className="h" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                Пригласить
              </h2>
              <button
                className="btn ghost icon"
                style={{ marginLeft: "auto" }}
                aria-label="Закрыть"
                onClick={() => {
                  setInviteOpen(false);
                  setCreatedInvite(null);
                }}
              >
                ✕
              </button>
            </div>

            {createdInvite ? (
              <>
                <div className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
                  Приглашение создано. Скопируйте ссылку и отправьте «{createdInvite.email}» любым
                  удобным способом — письмо не отправляется автоматически.
                </div>
                <input className="inp" readOnly value={createdInvite.inviteUrl} onFocus={(e) => e.target.select()} />
                <button
                  type="button"
                  className="btn pri"
                  onClick={() => navigator.clipboard?.writeText(createdInvite.inviteUrl)}
                >
                  Скопировать ссылку
                </button>
              </>
            ) : (
              <form onSubmit={handleInvite} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <label className="f">
                  <span>Email</span>
                  <input
                    className="inp"
                    type="email"
                    placeholder="name@example.ru"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </label>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                  Приглашённый получит полный доступ ко всем разделам админки.
                </div>
                <button type="submit" className="btn pri" style={{ minHeight: 44 }} disabled={submitting}>
                  {submitting ? "Создаём..." : "Создать приглашение"}
                </button>
              </form>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
