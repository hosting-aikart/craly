import jwt from 'jsonwebtoken';
import config from '../config/index';

export type UserRole = 'contractor' | 'business' | 'admin';

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
