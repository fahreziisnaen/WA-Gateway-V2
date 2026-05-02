import React, { createContext, useContext, useState, useCallback } from 'react';
import { login as apiLogin } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('wa_token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('wa_user'));
    } catch {
      return null;
    }
  });

  const login = useCallback(async (username, password) => {
    const res = await apiLogin(username, password);
    const { token, user } = res.data;
    localStorage.setItem('wa_token', token);
    localStorage.setItem('wa_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('wa_token');
    localStorage.removeItem('wa_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, setUser, login, logout, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
