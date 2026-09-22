import pg from 'pg';
import dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
dotenv.config();
export const pool = new pg.Pool({
  ...(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {}),
  max: 10, connectionTimeoutMillis: 3000,
});
pool.on('error', error => console.error('Database connection error:', error.message));
export const query = (text: string, params?: any[]) => pool.query(text, params);
export async function initDb() {
  // Fail closed: never claim persistence while silently storing user data in RAM.
  await query(await readFile(resolve(process.cwd(), 'schema.sql'), 'utf8'));
}
