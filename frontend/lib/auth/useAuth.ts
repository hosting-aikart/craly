'use client';

import { useCallback, useEffect, useState } from 'react';
import { me, logout as logoutRequest, type AuthUser } from '@/lib/api/auth';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

/**
 * Reads the session from the `craly_token` cookie via GET /auth/me. There's
 * no server-side session check (the cookie is httpOnly, unreadable by
 * client JS) — every page that needs auth calls this and handles the
 * loading/redirect itself. Simple and fine at this scale; a Next.js
 * middleware hitting the backend would avoid the loading flash if that
 * ever becomes worth the extra round trip.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  const refresh = useCallback(async () => {
    try {
      const { data } = await me();
      setState({ user: data, loading: false });
    } catch {
      setState({ user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => {});
    setState({ user: null, loading: false });
  }, []);

  return { ...state, refresh, logout };
}
