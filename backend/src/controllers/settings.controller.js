import {
  getAllUsers,
  createUser,
  changePassword,
  deleteUser,
} from '../services/user.service.js';

import {
  getAllKeys,
  createKey,
  revokeKey,
  maskKey,
} from '../services/apikey.service.js';

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
    await changePassword(id, password);
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function deleteUserController(req, res) {
  try {
    const { id } = req.params;
    // Prevent self-deletion
    if (req.user?.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await deleteUser(id);
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
    // Return full key ONCE — this is the only time it's visible
    return res.status(201).json(entry);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function revokeKeyController(req, res) {
  try {
    await revokeKey(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
