import { apiGet, apiPost } from '@/lib/api';

export type UserRole = 'contractor' | 'business' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export const signup = (input: { email: string; password: string; role: 'contractor' | 'business'; companyName: string }) =>
  apiPost<{ data: AuthUser }>('/auth/signup', input);

export const login = (input: { email: string; password: string }) =>
  apiPost<{ data: AuthUser }>('/auth/login', input);

export const logout = () => apiPost<{ data: { success: true } }>('/auth/logout', {});

export const me = () => apiGet<{ data: AuthUser }>('/auth/me');
