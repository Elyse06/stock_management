import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { queryClient } from "@/config/queryClient";
import { clearTokens, registerOnLogout } from "@/lib/api/tokenStore";

import * as authApi from "../api/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const resetSession = useCallback(() => {
    setUser(null);
    // Aucune donnée d'un utilisateur ne doit rester en cache pour le suivant.
    queryClient.clear();
  }, []);

  useEffect(() => {
    registerOnLogout(resetSession);
  }, [resetSession]);

  useEffect(() => {
    let actif = true;
    authApi
      .restoreSession()
      .then((me) => actif && setUser(me))
      .catch(() => clearTokens())
      .finally(() => actif && setInitializing(false));
    return () => {
      actif = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const me = await authApi.login(email, password);
    queryClient.clear();
    setUser(me);
    return me;
  }, []);

  /** Recharge l'utilisateur (droits, employé lié) après une modification de son propre compte. */
  const refreshUser = useCallback(async () => {
    const me = await authApi.fetchCurrentUser();
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    resetSession();
  }, [resetSession]);

  const value = useMemo(() => {
    const actions = new Set(user?.actions ?? []);
    return {
      user,
      loading: initializing,
      login,
      logout,
      refreshUser,
      /** Vrai si l'utilisateur possède TOUTES les actions. */
      hasAction: (...ids) => ids.every((id) => actions.has(id)),
      /** Vrai si l'utilisateur possède AU MOINS UNE des actions (ou si la liste est vide). */
      hasAnyAction: (...ids) => ids.length === 0 || ids.some((id) => actions.has(id)),
    };
  }, [user, initializing, login, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>");
  return context;
}
