import { apiGet, apiPost } from '@/lib/api';

// 'contractor' stays in the union for legacy account records/typing, even
// though it's no longer a signup-able role — see docs/open-decisions.md.
export type UserRole = 'contractor' | 'business' | 'admin' | 'ops_head' | 'field_staff';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export const signup = (input: { email: string; password: string; role: 'business'; companyName: string }) =>
  apiPost<{ data: AuthUser }>('/auth/signup', input);

export const login = (input: { email: string; password: string }) =>
  apiPost<{ data: AuthUser }>('/auth/login', input);

export const logout = () => apiPost<{ data: { success: true } }>('/auth/logout', {});

export const me = () => apiGet<{ data: AuthUser }>('/auth/me');
