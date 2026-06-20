'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { AuthResponse, LoginInput, PublicUser, RegisterInput } from '@lumo/shared';
import { api, refreshAccess, setAccessToken } from './api-client';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: try to restore a session from the refresh cookie.
  useEffect(() => {
    let active = true;
    void (async () => {
      const refreshed = await refreshAccess();
      if (active && refreshed) setUser(refreshed.user as PublicUser);
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function login(input: LoginInput) {
    const res = await api.post<AuthResponse>('/auth/login', input);
    setAccessToken(res.accessToken);
    setUser(res.user);
  }
  async function register(input: RegisterInput) {
    const res = await api.post<AuthResponse>('/auth/register', input);
    setAccessToken(res.accessToken);
    setUser(res.user);
  }
  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }

  async function refreshUser() {
    const res = await api.get<{ user: PublicUser }>('/me');
    setUser(res.user);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
