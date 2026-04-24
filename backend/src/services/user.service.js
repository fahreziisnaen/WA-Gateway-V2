import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import db from './db.js';

function safe(user) {
  const { password, created_at, must_change_password, ...rest } = user;
  return { ...rest, createdAt: created_at, mustChangePassword: must_change_password === 1 };
}

export function getAllUsers() {
  return db.prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at').all()
    .map((u) => ({ id: u.id, username: u.username, role: u.role, createdAt: u.created_at }));
}

export function findByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) ?? null;
}

export async function verifyPassword(username, password) {
  const user = findByUsername(username);
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.password);
  return valid ? safe(user) : null;
}

export async function createUser(username, password) {
  if (findByUsername(username)) throw new Error(`Username "${username}" already exists`);
  const user = {
    id: randomBytes(8).toString('hex'),
    username,
    password: await bcrypt.hash(password, 10),
    role: 'admin',
    created_at: new Date().toISOString(),
  };
  db.prepare('INSERT INTO users (id, username, password, role, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(user.id, user.username, user.password, user.role, user.created_at);
  return safe(user);
}

export async function changePassword(id, newPassword) {
  const hashed = await bcrypt.hash(newPassword, 10);
  const result = db.prepare('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?').run(hashed, id);
  if (result.changes === 0) throw new Error('User not found');
}

export function deleteUser(id) {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count <= 1) throw new Error('Cannot delete the last user');
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (result.changes === 0) throw new Error('User not found');
}
