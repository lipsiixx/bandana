import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../api/adminApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then((res) => setAdmin(res.admin))
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(password) {
    const res = await authApi.login(password);
    setAdmin(res.admin);
  }

  async function logout() {
    await authApi.logout();
    setAdmin(null);
  }

  function setAdminDirect(nextAdmin) {
    setAdmin(nextAdmin);
  }

  return (
    <AuthContext.Provider
      value={{ admin, authenticated: Boolean(admin), loading, login, logout, setAdminDirect }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен использоваться внутри AuthProvider");
  return ctx;
}
