import {
  getAllUsers,
  createUser,
  changePassword,
  deleteUser,
  findByUsername,
  enable2FA,
  disable2FA,
} from '../services/user.service.js';

import { authenticator } from 'otplib';
import qrcode from 'qrcode';

import {
  getAllKeys,
  createKey,
  revokeKey,
  maskKey,
} from '../services/apikey.service.js';

import { addAuditLog } from '../services/audit.service.js';
import { getSourceIp } from '../utils/request.utils.js';

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUsersController(req, res) {
  try {
    return res.json(await getAllUsers());
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createUserController(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const user = await createUser(username, password);
    addAuditLog({
      actor: req.user?.username, actorId: req.user?.id,
      action: 'user.create', details: { username },
      ip: getSourceIp(req),
    });
    return res.status(201).json(user);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function changePasswordController(req, res) {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const target = getAllUsers().find((u) => u.id === id);
    await changePassword(id, password);
    addAuditLog({
      actor: req.user?.username, actorId: req.user?.id,
      action: 'user.password_change',
      details: { targetUser: target?.username ?? id },
      ip: getSourceIp(req),
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function deleteUserController(req, res) {
  try {
    const { id } = req.params;
    if (req.user?.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const target = getAllUsers().find((u) => u.id === id);
    await deleteUser(id);
    addAuditLog({
      actor: req.user?.username, actorId: req.user?.id,
      action: 'user.delete', details: { username: target?.username ?? id },
      ip: getSourceIp(req),
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function setup2FAController(req, res) {
  try {
    const { id } = req.params;
    const targetUser = getAllUsers().find((u) => u.id === id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const secret = authenticator.generateSecret();
    // Temporarily save the secret but don't enable it yet
    import('../services/db.js').then(({ default: db }) => {
      db.prepare('UPDATE users SET two_factor_secret = ? WHERE id = ?').run(secret, id);
    });

    const otpauth = authenticator.keyuri(targetUser.username, 'WA-Gateway', secret);
    const qrDataURL = await qrcode.toDataURL(otpauth);

    return res.json({ secret, qrDataURL });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function verify2FAController(req, res) {
  try {
    const { id } = req.params;
    const { token } = req.body;
    
    const db = (await import('../services/db.js')).default;
    const rawUser = db.prepare('SELECT two_factor_secret FROM users WHERE id = ?').get(id);
    if (!rawUser || !rawUser.two_factor_secret) {
      return res.status(400).json({ error: '2FA setup not initiated' });
    }

    const isValid = authenticator.verify({ token, secret: rawUser.two_factor_secret });
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid 2FA code' });
    }

    enable2FA(id, rawUser.two_factor_secret);
    addAuditLog({
      actor: req.user?.username, actorId: req.user?.id,
      action: 'user.2fa.enable', details: { targetId: id },
      ip: getSourceIp(req),
    });

    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function disable2FAController(req, res) {
  try {
    const { id } = req.params;
    disable2FA(id);
    addAuditLog({
      actor: req.user?.username, actorId: req.user?.id,
      action: 'user.2fa.disable', details: { targetId: id },
      ip: getSourceIp(req),
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

// ── API Keys ──────────────────────────────────────────────────────────────────

export async function getKeysController(req, res) {
  try {
    const keys = await getAllKeys();
    const masked = keys.map(({ key_prefix, ...rest }) => ({
      ...rest,
      keyMasked: maskKey(key_prefix),
    }));
    return res.json(masked);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createKeyController(req, res) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Key name is required' });
    }
    const entry = await createKey(name.trim());
    addAuditLog({
      actor: req.user?.username, actorId: req.user?.id,
      action: 'apikey.create',
      details: { keyName: entry.name, keyPrefix: entry.key_prefix },
      ip: getSourceIp(req),
    });
    // Return full key ONCE — this is the only time it's visible
    return res.status(201).json(entry);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function revokeKeyController(req, res) {
  try {
    const keys = getAllKeys();
    const target = keys.find((k) => k.id === req.params.id);
    await revokeKey(req.params.id);
    addAuditLog({
      actor: req.user?.username, actorId: req.user?.id,
      action: 'apikey.revoke',
      details: { keyName: target?.name ?? req.params.id },
      ip: getSourceIp(req),
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
