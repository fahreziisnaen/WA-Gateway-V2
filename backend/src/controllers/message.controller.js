import { normalizeId } from '../utils/idNormalizer.js';
import { validateNumber } from '../whatsapp.js';
import { enqueueMessage } from '../services/queue.service.js';

/**
 * POST /send-message
 * Body: { id: string, message: string }
 */
export async function sendMessageController(req, res) {
  try {
    const { message, id } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: '`message` is required and must be a non-empty string' });
    }
    if (!id || typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ error: '`id` is required and must be a non-empty string' });
    }

    let normalised;
    try {
      normalised = normalizeId(id.trim());
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const { jid, isGroup } = normalised;

    // Validate personal numbers via Baileys
    if (!isGroup) {
      let exists;
      try {
        exists = await validateNumber(jid);
      } catch (err) {
        return res.status(503).json({
          error: 'WhatsApp is not connected. Cannot validate number.',
        });
      }

      if (!exists) {
        return res.status(422).json({
          error: `The number ${jid} is not registered on WhatsApp`,
        });
      }
    }

    const jobId = await enqueueMessage(jid, message.trim(), id.trim());

    return res.status(202).json({
      success: true,
      jobId,
      message: 'Message queued successfully',
      destination: jid,
      type: isGroup ? 'group' : 'personal',
    });
  } catch (err) {
    console.error('[sendMessage]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
