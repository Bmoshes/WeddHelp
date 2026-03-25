import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import type { Wedding } from './types';

type AuthState = {
  token: string | null;
  wedding: Wedding | null;
  login: (payload: { token: string; wedding: Wedding }) => void;
  logout: () => void;
};

const AUTH_STORAGE_KEY = 'weddhelp-auth';
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [wedding, setWedding] = useState<Wedding | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setToken(parsed.token ?? null);
      setWedding(parsed.wedding ?? null);
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const value = useMemo<AuthState>(() => ({
    token,
    wedding,
    login: (payload) => {
      setToken(payload.token);
      setWedding(payload.wedding);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
    },
    logout: () => {
      setToken(null);
      setWedding(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    },
  }), [token, wedding]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
