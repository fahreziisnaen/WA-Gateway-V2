/**
 * waManager.js — Multi-instance WhatsApp manager
 *
 * Manages a pool of independent Baileys connections.
 * Each instance has its own session directory and lifecycle.
 *
 * Instance state shape:
 * {
 *   id:     string,
 *   name:   string,
 *   sock:   WASocket | null,
 *   status: 'disconnected' | 'connecting' | 'connected',
 *   qr:     string | null,   // base64 data-URL
 *   phone:  string | null,
 *   waName: string | null,   // WhatsApp display name
 * }
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import fs from 'fs-extra';
import path from 'path';
import pino from 'pino';

const SESSIONS_ROOT = process.env.SESSION_DIR
  ? path.resolve(process.env.SESSION_DIR)
  : path.join(process.cwd(), 'sessions');

const INSTANCES_FILE = path.join(process.cwd(), 'data', 'instances.json');

const logger = pino({ level: 'silent' });

// ── In-memory state ───────────────────────────────────────────────────────────
/** @type {Map<string, object>} */
const instances = new Map();

/**
 * Per-instance contacts cache: instanceId → Map<jid, displayName>
 * Populated from Baileys contacts.upsert / contacts.update events.
 * @type {Map<string, Map<string, string>>}
 */
const contactsCache = new Map();

let ioInstance = null;
/** @type {Set<string>} tracks which instance ids are currently connecting */
const connecting = new Set();

// ── Persistence helpers ───────────────────────────────────────────────────────

async function loadPersistedInstances() {
  await fs.ensureDir(path.dirname(INSTANCES_FILE));
  if (!(await fs.pathExists(INSTANCES_FILE))) return [];
  return fs.readJson(INSTANCES_FILE);
}

async function savePersistedInstances() {
  const list = [...instances.values()].map(({ id, name }) => ({ id, name }));
  await fs.writeJson(INSTANCES_FILE, list, { spaces: 2 });
}

// ── Socket.IO emitter ─────────────────────────────────────────────────────────

function emitInstanceStatus(id) {
  if (!ioInstance) return;
  const inst = instances.get(id);
  if (!inst) return;
  ioInstance.emit('instance_status', {
    id: inst.id,
    name: inst.name,
    status: inst.status,
    phone: inst.phone,
    waName: inst.waName,
  });
}

// ── Core connection logic ─────────────────────────────────────────────────────

async function connectInstance(id) {
  if (connecting.has(id)) return;
  connecting.add(id);

  const inst = instances.get(id);
  if (!inst) { connecting.delete(id); return; }

  const sessionDir = path.join(SESSIONS_ROOT, id);
  await fs.ensureDir(sessionDir);

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      defaultQueryTimeoutMs: 60_000,
      connectTimeoutMs: 60_000,
      keepAliveIntervalMs: 25_000,
      retryRequestDelayMs: 2_000,
      generateHighQualityLinkPreview: false,
    });

    inst.sock = sock;
    sock.ev.on('creds.update', saveCreds);

    // ── Contacts cache ───────────────────────────────────────────────────────
    if (!contactsCache.has(id)) contactsCache.set(id, new Map());
    const contacts = contactsCache.get(id);

    function upsertContacts(list) {
      for (const c of list) {
        const name = c.notify || c.name || c.verifiedName || null;
        if (c.id && name) contacts.set(c.id, name);
      }
    }

    sock.ev.on('contacts.upsert', upsertContacts);
    sock.ev.on('contacts.update', (updates) => {
      for (const u of updates) {
        const name = u.notify || u.name || u.verifiedName || null;
        if (u.id && name) contacts.set(u.id, name);
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          inst.qr = await qrcode.toDataURL(qr);
        } catch { inst.qr = null; }
        inst.status = 'connecting';
        emitInstanceStatus(id);
        console.log(`[wa:${id}] QR generated`);
      }

      if (connection === 'close') {
        connecting.delete(id);
        const code = lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output.statusCode
          : null;
        const shouldReconnect = code !== DisconnectReason.loggedOut;

        inst.status = 'disconnected';
        inst.phone = null;
        inst.waName = null;
        inst.sock = null;
        contactsCache.get(id)?.clear();
        emitInstanceStatus(id);

        if (shouldReconnect && instances.has(id)) {
          console.log(`[wa:${id}] Disconnected (${code}), reconnecting in 5s…`);
          setTimeout(() => connectInstance(id), 5_000);
        } else {
          inst.qr = null;
          console.log(`[wa:${id}] Logged out`);
        }
      }

      if (connection === 'open') {
        connecting.delete(id);
        inst.qr = null;
        inst.status = 'connected';
        const rawId = sock.user?.id ?? '';
        inst.phone = rawId.split(':')[0].split('@')[0] || null;
        inst.waName = sock.user?.name ?? null;
        emitInstanceStatus(id);
        console.log(`[wa:${id}] Connected as ${inst.waName} (${inst.phone})`);
      }
    });

  } catch (err) {
    connecting.delete(id);
    console.error(`[wa:${id}] Error:`, err.message);
    if (instances.has(id)) {
      setTimeout(() => connectInstance(id), 5_000);
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function initManager(io) {
  ioInstance = io;
  const persisted = await loadPersistedInstances();

  for (const { id, name } of persisted) {
    instances.set(id, {
      id, name,
      sock: null, status: 'disconnected',
      qr: null, phone: null, waName: null,
    });
  }

  await savePersistedInstances();

  // Start all connections
  for (const id of instances.keys()) {
    connectInstance(id);
  }
}

export function getAllInstances() {
  return [...instances.values()].map(({ id, name, status, phone, waName }) => ({
    id, name, status, phone, waName,
  }));
}

export function getInstance(id) {
  return instances.get(id) ?? null;
}

/**
 * Get the first connected instance, or null.
 */
export function getFirstConnectedInstance() {
  for (const inst of instances.values()) {
    if (inst.status === 'connected') return inst;
  }
  return null;
}

export async function addInstance(id, name) {
  if (instances.has(id)) throw new Error(`Instance "${id}" already exists`);
  if (!/^[a-z0-9_-]+$/i.test(id)) {
    throw new Error('Instance ID must be alphanumeric (letters, numbers, _ -)');
  }
  instances.set(id, {
    id, name,
    sock: null, status: 'disconnected',
    qr: null, phone: null, waName: null,
  });
  await savePersistedInstances();
  // Notify dashboard immediately so the new instance appears in the list
  if (ioInstance) {
    ioInstance.emit('instance_added', { id, name, status: 'disconnected', phone: null, waName: null });
  }
  connectInstance(id);
}

export async function removeInstance(id) {
  const inst = instances.get(id);
  if (!inst) throw new Error(`Instance "${id}" not found`);

  // Disconnect gracefully
  try {
    if (inst.sock) await inst.sock.logout().catch(() => {});
  } catch (_) {}

  instances.delete(id);
  contactsCache.delete(id);
  await savePersistedInstances();

  // Notify dashboard so the instance is removed from the list immediately
  if (ioInstance) {
    ioInstance.emit('instance_removed', { id });
  }

  // Remove session files
  const sessionDir = path.join(SESSIONS_ROOT, id);
  await fs.remove(sessionDir);
  console.log(`[wa:${id}] Removed`);
}

export async function resetInstance(id) {
  const inst = instances.get(id);
  if (!inst) throw new Error(`Instance "${id}" not found`);

  try {
    if (inst.sock) await inst.sock.logout().catch(() => {});
  } catch (_) {}

  inst.sock = null;
  inst.status = 'disconnected';
  inst.phone = null;
  inst.waName = null;
  inst.qr = null;
  connecting.delete(id);
  emitInstanceStatus(id);

  const sessionDir = path.join(SESSIONS_ROOT, id);
  await fs.remove(sessionDir);
  await fs.ensureDir(sessionDir);

  setTimeout(() => connectInstance(id), 1_000);
}

export function getQR(id) {
  return instances.get(id)?.qr ?? null;
}

export function getStatus(id) {
  const inst = instances.get(id);
  if (!inst) return null;
  return { id: inst.id, name: inst.name, status: inst.status, phone: inst.phone, waName: inst.waName };
}

export async function sendMessage(instanceId, jid, text) {
  const inst = instances.get(instanceId);
  if (!inst) throw new Error(`Instance "${instanceId}" not found`);
  if (inst.status !== 'connected' || !inst.sock) {
    throw new Error(`Instance "${instanceId}" is not connected (status: ${inst.status})`);
  }
  await inst.sock.sendMessage(jid, { text });
}

export async function getGroups(instanceId) {
  const inst = instances.get(instanceId);
  if (!inst) throw new Error(`Instance "${instanceId}" not found`);
  if (inst.status !== 'connected' || !inst.sock) {
    throw new Error(`Instance "${instanceId}" is not connected`);
  }
  const groups = await inst.sock.groupFetchAllParticipating();
  return Object.values(groups).map((g) => ({ id: g.id, name: g.subject }));
}

export async function validateNumber(instanceId, jid) {
  const inst = instances.get(instanceId);
  if (!inst?.sock || inst.status !== 'connected') {
    throw new Error(`Instance "${instanceId}" is not connected`);
  }
  const result = await inst.sock.onWhatsApp(jid);
  return Array.isArray(result) && result.length > 0 && result[0].exists === true;
}

/**
 * Resolve a human-readable name for a recipient JID.
 *
 * Group   → fetch group metadata subject
 * Personal → contacts cache (name from phone book sync) or null
 *
 * Returns null if name cannot be determined (caller stores null, UI falls back).
 *
 * @param {string} instanceId
 * @param {string} jid         Normalised WhatsApp JID
 * @param {boolean} isGroup
 * @returns {Promise<string|null>}
 */
export async function getRecipientName(instanceId, jid, isGroup) {
  const inst = instances.get(instanceId);
  if (!inst?.sock || inst.status !== 'connected') return null;

  try {
    if (isGroup) {
      const meta = await inst.sock.groupMetadata(jid);
      return meta?.subject ?? null;
    } else {
      // Check contacts cache first (populated from contacts.upsert events)
      const cached = contactsCache.get(instanceId)?.get(jid);
      if (cached) return cached;

      // Fallback: try fetching business profile (works for business accounts)
      try {
        const profile = await inst.sock.getBusinessProfile(jid);
        if (profile?.name) return profile.name;
      } catch { /* not a business or not available */ }

      return null;
    }
  } catch (err) {
    console.warn(`[wa:${instanceId}] getRecipientName failed for ${jid}:`, err.message);
    return null;
  }
}
