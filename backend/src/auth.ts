import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Request, Response, NextFunction } from 'express';
import { query } from './db.js';
import { assert } from './validation.js';
const scrypt = promisify(scryptCallback);
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + ((await scrypt(password, salt, 64)) as Buffer).toString('hex');
}
export async function passwordMatches(password: string, stored: string) {
  const [salt, hex] = stored.split(':');
  if (!salt || !hex) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(hex, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
export const cookieToken = (req: Request) => /(?:^|;\s*)gamio_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
export async function session(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = cookieToken(req);
    if (token) {
      const result = await query('SELECT u.id,u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=$1 AND expires_at>now()', [hash(token)]);
      (req as any).user = result.rows[0];
    }
    next();
  } catch (e) { next(e); }
}
export const user = (req: Request) => {
  assert((req as any).user, 'Please sign in to continue', 401);
  return (req as any).user as { id: string; username: string };
};
export async function signIn(res: Response, id: string) {
  const token = randomBytes(32).toString('hex');
  await query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 days')", [hash(token), id]);
  res.cookie('gamio_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 30*86400000, path: '/' });
}
