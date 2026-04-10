import { getStatus } from '../whatsapp.js';

/**
 * GET /status
 * Returns current WhatsApp connection status.
 */
export async function getStatusController(req, res) {
  return res.json(getStatus());
}
