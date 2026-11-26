import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try {
      const raw = localStorage.getItem('bp_admin');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('bp_token') || null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('bp_token')));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    authApi
      .me()
      .then(({ data }) => {
        if (!active) return;
        setAdmin(data.admin);
        localStorage.setItem('bp_admin', JSON.stringify(data.admin));
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem('bp_token');
        localStorage.removeItem('bp_admin');
        setToken(null);
        setAdmin(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const login = useCallback(async (username, password) => {
    const { data } = await authApi.login({ username, password });
    localStorage.setItem('bp_token', data.token);
    localStorage.setItem('bp_admin', JSON.stringify(data.admin));
    setToken(data.token);
    setAdmin(data.admin);
    return data.admin;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('bp_token');
    localStorage.removeItem('bp_admin');
    setToken(null);
    setAdmin(null);
  }, []);

  const refreshAdmin = useCallback(async () => {
    const { data } = await authApi.me();
    setAdmin(data.admin);
    localStorage.setItem('bp_admin', JSON.stringify(data.admin));
  }, []);

  const updateToken = useCallback((newToken) => {
    localStorage.setItem('bp_token', newToken);
    setToken(newToken);
  }, []);

  return (
    <AuthContext.Provider value={{ admin, token, loading, login, logout, refreshAdmin, updateToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);