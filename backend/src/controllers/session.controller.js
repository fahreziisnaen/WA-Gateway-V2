import { getQR, resetSession } from '../whatsapp.js';

/**
 * GET /qr
 * Returns the current QR code as a base64 data-URL, or 404 if none.
 */
export async function getQRController(req, res) {
  const qr = getQR();
  if (!qr) {
    return res.status(404).json({ error: 'No QR code available. Already connected or not yet generated.' });
  }
  return res.json({ qr });
}

/**
 * POST /reset-session
 * Deletes session files and forces a new QR login.
 */
export async function resetSessionController(req, res) {
  try {
    await resetSession();
    return res.json({ success: true, message: 'Session reset. Scan the new QR code to reconnect.' });
  } catch (err) {
    console.error('[resetSession]', err);
    return res.status(500).json({ error: 'Failed to reset session' });
  }
}
