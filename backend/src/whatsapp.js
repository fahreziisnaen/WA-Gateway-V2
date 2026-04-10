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
import { fileURLToPath } from 'url';
import pino from 'pino';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SESSION_DIR = process.env.SESSION_DIR
  ? path.resolve(process.env.SESSION_DIR)
  : path.join(process.cwd(), 'sessions');

// Silent logger — suppress Baileys internal output
const logger = pino({ level: 'silent' });

// ── Singleton state ──────────────────────────────────────────────────────────
let sock = null;
let qrBase64 = null;
let connectionStatus = 'disconnected';
let phoneInfo = { phone: null, name: null };
let ioInstance = null;
let isConnecting = false;

// ── Public init ──────────────────────────────────────────────────────────────

/**
 * Initialise WhatsApp and attach Socket.IO for real-time status events.
 * @param {import('socket.io').Server} io
 */
export async function initWhatsApp(io) {
  ioInstance = io;
  await connectToWhatsApp();
}

// ── Connection logic ─────────────────────────────────────────────────────────

async function connectToWhatsApp() {
  if (isConnecting) return;
  isConnecting = true;

  try {
    await fs.ensureDir(SESSION_DIR);

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`[wa] Using Baileys v${version.join('.')}${isLatest ? ' (latest)' : ''}`);

    sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: true,
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

    // Persist credentials whenever they change
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          qrBase64 = await qrcode.toDataURL(qr);
        } catch {
          qrBase64 = null;
        }
        connectionStatus = 'connecting';
        emitStatus();
        console.log('[wa] QR generated — scan with WhatsApp');
      }

      if (connection === 'close') {
        isConnecting = false;

        const statusCode =
          lastDisconnect?.error instanceof Boom
            ? lastDisconnect.error.output.statusCode
            : null;

        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        connectionStatus = 'disconnected';
        phoneInfo = { phone: null, name: null };
        emitStatus();

        if (shouldReconnect) {
          console.log(`[wa] Disconnected (code ${statusCode}), reconnecting in 5 s…`);
          setTimeout(connectToWhatsApp, 5_000);
        } else {
          console.log('[wa] Logged out. Session cleared.');
          qrBase64 = null;
        }
      }

      if (connection === 'open') {
        isConnecting = false;
        qrBase64 = null;
        connectionStatus = 'connected';

        const rawId = sock.user?.id ?? '';
        phoneInfo = {
          phone: rawId.split(':')[0].split('@')[0] || null,
          name: sock.user?.name ?? null,
        };

        emitStatus();
        console.log(`[wa] Connected as ${phoneInfo.name} (${phoneInfo.phone})`);
      }
    });
  } catch (err) {
    isConnecting = false;
    console.error('[wa] Connection error:', err.message);
    setTimeout(connectToWhatsApp, 5_000);
  }
}

function emitStatus() {
  if (ioInstance) {
    ioInstance.emit('status', { status: connectionStatus, ...phoneInfo });
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a text message.
 * @param {string} jid   Normalised JID (e.g. 628xxx@s.whatsapp.net or group@g.us)
 * @param {string} text  Message text (supports WhatsApp markdown)
 */
export async function sendMessage(jid, text) {
  if (!sock || connectionStatus !== 'connected') {
    throw new Error('WhatsApp is not connected');
  }
  await sock.sendMessage(jid, { text });
}

/**
 * Return all groups the account has joined.
 * @returns {Promise<{ id: string, name: string }[]>}
 */
export async function getGroups() {
  if (!sock || connectionStatus !== 'connected') {
    throw new Error('WhatsApp is not connected');
  }
  const groups = await sock.groupFetchAllParticipating();
  return Object.values(groups).map((g) => ({
    id: g.id,
    name: g.subject,
  }));
}

/**
 * Check whether a personal number exists on WhatsApp.
 * @param {string} jid  e.g. 628xxx@s.whatsapp.net
 * @returns {Promise<boolean>}
 */
export async function validateNumber(jid) {
  if (!sock || connectionStatus !== 'connected') {
    throw new Error('WhatsApp is not connected');
  }
  const result = await sock.onWhatsApp(jid);
  return Array.isArray(result) && result.length > 0 && result[0].exists === true;
}

/**
 * Delete the current session and force a new QR login.
 */
export async function resetSession() {
  try {
    if (sock) {
      await sock.logout().catch(() => {});
      sock = null;
    }
  } catch (_) { /* ignore */ }

  await fs.remove(SESSION_DIR);
  await fs.ensureDir(SESSION_DIR);

  connectionStatus = 'disconnected';
  phoneInfo = { phone: null, name: null };
  qrBase64 = null;
  isConnecting = false;

  emitStatus();

  // Give a moment before reconnecting so listeners get the disconnected event
  setTimeout(connectToWhatsApp, 1_000);
}

/** @returns {{ status: string, phone: string|null, name: string|null }} */
export function getStatus() {
  return { status: connectionStatus, ...phoneInfo };
}

/** @returns {string|null} Base64 data-URL of the current QR code, or null */
export function getQR() {
  return qrBase64;
}
