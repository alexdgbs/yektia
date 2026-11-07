import { useCallback, useEffect, useState } from "react";
import { accountApi } from "../services/accountApi";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginNotice, setLoginNotice] = useState("");
  const refresh = useCallback(
    () =>
      accountApi
        .me()
        .then(({ user: current }) => {
          setUser(current);
          return current;
        })
        .catch(() => {
          setUser(null);
          return null;
        }),
    [],
  );
  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);
  useEffect(() => {
    if (!loginNotice) return undefined;
    const timer = window.setTimeout(() => setLoginNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [loginNotice]);
  const googleLogin = useCallback(async (credential) => {
    const session = await accountApi.googleLogin(credential);
    setLoginNotice(
      session.isNew
        ? "Tu cuenta fue creada con Google."
        : "Bienvenido de nuevo.",
    );
    setUser(session.user);
    return session;
  }, []);
  const logout = useCallback(async () => {
    try {
      await accountApi.logout();
    } finally {
      setUser(null);
      setLoginNotice("");
    }
  }, []);
  const updateProfile = useCallback(async (payload) => {
    const result = await accountApi.updateMe(payload);
    setUser(result.user);
    return result.user;
  }, []);
  const syncFavorites = useCallback(async (doctorIds) => {
    const result = await accountApi.syncFavorites(doctorIds);
    setUser(result.user);
    return result.user;
  }, []);
  return {
    user,
    loading,
    loginNotice,
    googleLogin,
    logout,
    refresh,
    updateProfile,
    syncFavorites,
  };
}
