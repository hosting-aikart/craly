'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { me, logout as logoutRequest, type AuthUser } from '@/lib/api/auth';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Reads the session from the `craly_token` cookie via GET /auth/me. There's
 * no server-side session check (the cookie is httpOnly, unreadable by
 * client JS), so this provider fetches it once on mount and holds the
 * result in a single shared context — every page and the Navbar read the
 * same state instead of each running its own fetch.
 *
 * That sharing matters because login/signup navigate with `router.push`
 * (a client-side transition, not a full reload), so the Navbar never
 * remounts. Without a shared context it would keep showing "Log In / Sign
 * Up" after a successful login until the next hard refresh. Call
 * `refresh()` right after a successful login/signup/logout so every
 * consumer — Navbar included — updates immediately.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await me();
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider (check app/layout.tsx)');
  }
  return ctx;
}
