import { getGroups } from '../whatsapp.js';

/**
 * GET /groups
 * Returns all WhatsApp groups the account has joined.
 */
export async function getGroupsController(req, res) {
  try {
    const groups = await getGroups();
    return res.json(groups);
  } catch (err) {
    console.error('[getGroups]', err);
    return res.status(503).json({ error: err.message });
  }
}
