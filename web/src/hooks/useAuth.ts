'use client';

import { useState, useEffect, useCallback } from 'react';

interface AuthState {
  token: string | null;
  user: { id: string; email: string; name: string; role: string } | null;
  company: { id: string; name: string; slug: string } | null;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    token: null,
    user: null,
    company: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('auth');
    if (stored) {
      try {
        setAuth(JSON.parse(stored));
      } catch {
        localStorage.removeItem('auth');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((data: AuthState) => {
    setAuth(data);
    localStorage.setItem('auth', JSON.stringify(data));
  }, []);

  const logout = useCallback(() => {
    setAuth({ token: null, user: null, company: null });
    localStorage.removeItem('auth');
  }, []);

  return { ...auth, loading, login, logout, isAuthenticated: !!auth.token };
}
