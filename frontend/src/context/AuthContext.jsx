import { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as authApi from "../api/auth";
import { registerOnLogout } from "../api/tokenStore";

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

  const login = async (username, password) => {
    setLoading(true);
    try {
      const me = await authApi.login(username, password);
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

  const hasProfil = (...noms) => {
    if (!user) return false;
    return noms.includes(user.profil_nom);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasProfil }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit etre utilise a l'interieur de <AuthProvider>");
  }
  return context;
}
