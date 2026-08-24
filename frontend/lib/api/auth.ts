import { apiGet, apiPost } from '@/lib/api';

// 'contractor' stays in the union for legacy account records/typing, even
// though it's no longer a signup-able role — see docs/open-decisions.md.
export type UserRole = 'contractor' | 'business' | 'admin' | 'ops_head' | 'field_staff' | 'staff';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface SignupInput {
  email: string;
  password: string;
  // Kept as a union — the backend still accepts 'contractor' (a separate,
  // actively developed effort depends on it: see authController.signup).
  // Only the public UI paths into a contractor signup were removed (this
  // page never sends 'contractor'); see docs/open-decisions.md.
  role: 'business' | 'contractor';
  companyName: string;
  mobile?: string;
  city?: string;
  state?: string;
  workforceSize?: number;
  yearsExperience?: number;
}

export const signup = (input: SignupInput) =>
  apiPost<{ data: AuthUser }>('/auth/signup', input);

export const sendSignupOtp = (input: { email: string; mobile: string; name?: string }) =>
  apiPost<{ data: { success: boolean; message: string; expiresInSeconds: number } }>('/auth/send-otp', input);

export const verifySignupOtp = (input: { email: string; mobile: string; emailOtp: string; phoneOtp: string }) =>
  apiPost<{ data: { success: boolean; verified: boolean; message: string } }>('/auth/verify-otp', input);

export const login = (input: { email: string; password: string }) =>
  apiPost<{ data: AuthUser }>('/auth/login', input);

export const logout = () => apiPost<{ data: { success: true } }>('/auth/logout', {});

export const me = () => apiGet<{ data: AuthUser }>('/auth/me');

