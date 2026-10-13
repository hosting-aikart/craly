import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function comparePassword(plain: string, hash?: string | null): Promise<boolean> {
  if (!plain || !hash) return Promise.resolve(false);
  return bcrypt.compare(plain, hash).catch(() => false);
}
