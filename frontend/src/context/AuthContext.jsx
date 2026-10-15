import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { api } from "../services/api";

const AUTH_KEY = "talentflow_auth";
const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
    };
    window.addEventListener("talentflow:auth_expired", handleAuthExpired);
    return () => window.removeEventListener("talentflow:auth_expired", handleAuthExpired);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Đăng nhập thất bại");
      }
      localStorage.setItem(AUTH_KEY, JSON.stringify(res.data));
      setUser(res.data);
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, logout, isAuthenticated: Boolean(user) }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};