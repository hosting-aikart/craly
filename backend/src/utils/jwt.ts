import jwt from 'jsonwebtoken';
import config from '../config/index';

// 'ops_head' and 'field_staff' are Prima Facie's internal operations roles
// (see docs/open-decisions.md) — added alongside the existing values rather
// than replacing them, since 'contractor'/'business' still back the
// self-service login flow elsewhere in the app.
export type UserRole = 'contractor' | 'business' | 'admin' | 'ops_head' | 'field_staff' | 'staff';

export interface AuthTokenPayload {
  sub: string; // user id
  role: UserRole;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
}
