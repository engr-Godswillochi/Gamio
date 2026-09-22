import { randomBytes } from 'node:crypto';
import { initDb, query, pool } from './db.js';
import { passwordHash, hash } from './auth.js';
import { assert } from './validation.js';
const username=process.argv[2];
assert(username && /^[a-zA-Z][a-zA-Z0-9_]{2,23}$/.test(username),'Pass a 3–24 character moderator username');
await initDb();
const password=randomBytes(24).toString('base64url'), recoveryCode=randomBytes(24).toString('hex');
// Never promote an existing account: a reserved username must not be claimable by a visitor.
await query('INSERT INTO users(username,email,password_hash,recovery_hash) VALUES($1,$2,$3,$4)',[username,username.toLowerCase()+'@account.gamio.invalid',await passwordHash(password),hash(recoveryCode)]);
console.log(JSON.stringify({username,password,recoveryCode,note:'Save these credentials privately. Set ADMIN_USERNAMES to this username and restart the app.'}));
await pool.end();
