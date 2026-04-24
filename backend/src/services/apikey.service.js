import { createHash, randomBytes } from 'crypto';
import db from './db.js';

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

export function generateRawKey() {
  return 'wag_' + randomBytes(24).toString('hex');
}

export function getAllKeys() {
  return db.prepare('SELECT id, name, key_prefix, created_at, last_used FROM api_keys ORDER BY created_at').all()
    .map((k) => ({ ...k, createdAt: k.created_at, lastUsed: k.last_used }));
}

export function createKey(name) {
  const raw = generateRawKey();
  const entry = {
    id: randomBytes(8).toString('hex'),
    name,
    key_hash: sha256(raw),
    key_prefix: raw.slice(0, 8),
    created_at: new Date().toISOString(),
    last_used: null,
  };
  db.prepare('INSERT INTO api_keys (id, name, key_hash, key_prefix, created_at, last_used) VALUES (?, ?, ?, ?, ?, ?)')
    .run(entry.id, entry.name, entry.key_hash, entry.key_prefix, entry.created_at, entry.last_used);
  // Return raw key ONCE — it is never stored in plaintext
  return { id: entry.id, name: entry.name, key: raw, key_prefix: entry.key_prefix, createdAt: entry.created_at, lastUsed: entry.last_used };
}

export function revokeKey(id) {
  const result = db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
  if (result.changes === 0) throw new Error('API key not found');
}

export async function isValidKey(token) {
  if (!token) return false;
  if (process.env.API_KEY && token === process.env.API_KEY) return true;

  const hash = sha256(token);
  const row = db.prepare('SELECT id FROM api_keys WHERE key_hash = ?').get(hash);
  if (row) {
    db.prepare('UPDATE api_keys SET last_used = ? WHERE id = ?').run(new Date().toISOString(), row.id);
    return true;
  }
  return false;
}

export function maskKey(keyPrefix) {
  if (!keyPrefix) return '***';
  return keyPrefix + '••••••••••••';
}
