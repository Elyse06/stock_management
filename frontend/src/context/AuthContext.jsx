import { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as authApi from "../api/auth";
import { registerOnLogout, getAccessToken, clearTokens } from "../api/tokenStore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogout = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    registerOnLogout(handleLogout);
  }, [handleLogout]);

  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      
      if (!token) {
        return;
      }
      
      try {
        const me = await authApi.fetchCurrentUser();
        setUser(me);
      } catch (error) {
        clearTokens();
        setUser(null);
      }
    };
    initAuth();
  }, []);

  const login = async (utilisateur_mail, password) => {
    setLoading(true);
    try {
      const me = await authApi.login(utilisateur_mail, password);
      setUser(me);
      return me;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  const hasAction = (...actionIds) => {
    if (!user || !user.actions) return false;
    return actionIds.every((id) => user.actions.includes(id));
  };

  const hasAnyAction = (...actionIds) => {
    if (!user || !user.actions) return false;
    return actionIds.some((id) => user.actions.includes(id));
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, hasAction, hasAnyAction }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>");
  }
  return context;
}