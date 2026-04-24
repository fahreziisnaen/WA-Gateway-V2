import { normalizeId } from '../utils/idNormalizer.js';
import { getSourceIp } from '../utils/request.utils.js';
import { validateNumber, getFirstConnectedInstance, getInstance, getRecipientName } from '../services/waManager.js';
import { resolveAlias } from '../services/groupAlias.service.js';
import { enqueueMessage } from '../services/queue.service.js';
import { addLog } from '../services/log.service.js';

/**
 * POST /send-message
 * Body: { id, message, from? }
 *
 * `from` = instance ID (e.g. "wa1"). If omitted, uses the first connected instance.
 *
 * All failures are recorded in the message log so operators can diagnose issues
 * from the Logs page without needing to check server logs.
 */
export async function sendMessageController(req, res) {
  const sourceIp = getSourceIp(req);

  const { message, id, from } = req.body;

  // ── Validate body ────────────────────────────────────────────────────────────
  if (!message || typeof message !== 'string' || !message.trim()) {
    await addLog({
      sourceIp, id: id ?? null, message: null,
      status: 'failed', error: 'Missing or empty "message" field',
    });
    return res.status(400).json({ error: '`message` is required and must be a non-empty string' });
  }

  if (!id || typeof id !== 'string' || !id.trim()) {
    await addLog({
      sourceIp, id: null, message: message.trim(),
      status: 'failed', error: 'Missing or empty "id" field',
    });
    return res.status(400).json({ error: '`id` is required and must be a non-empty string' });
  }

  // ── Resolve instance ─────────────────────────────────────────────────────────
  let instance;
  if (from) {
    instance = getInstance(from.trim());
    if (!instance) {
      await addLog({
        sourceIp, id: id.trim(), message: message.trim(),
        status: 'failed', error: `Instance "${from}" not found`,
      });
      return res.status(404).json({ error: `Instance "${from}" not found` });
    }
    if (instance.status !== 'connected') {
      await addLog({
        sourceIp, instanceId: instance.id, instancePhone: instance.phone,
        id: id.trim(), message: message.trim(),
        status: 'failed',
        error: `Instance "${from}" is not connected (status: ${instance.status})`,
      });
      return res.status(503).json({
        error: `Instance "${from}" is not connected (status: ${instance.status})`,
      });
    }
  } else {
    instance = getFirstConnectedInstance();
    if (!instance) {
      await addLog({
        sourceIp, id: id.trim(), message: message.trim(),
        status: 'failed', error: 'No WhatsApp instance is connected',
      });
      return res.status(503).json({ error: 'No WhatsApp instance is connected' });
    }
  }

  // ── Resolve group alias → JID ────────────────────────────────────────────────
  let effectiveId = id.trim();
  const aliasJid = await resolveAlias(effectiveId);
  if (aliasJid) effectiveId = aliasJid;

  // ── Normalize destination ID ─────────────────────────────────────────────────
  let normalised;
  try {
    normalised = normalizeId(effectiveId);
  } catch (err) {
    await addLog({
      sourceIp, instanceId: instance.id, instancePhone: instance.phone,
      id: id.trim(), message: message.trim(),
      status: 'failed', error: err.message,
    });
    return res.status(400).json({ error: err.message });
  }

  const { jid, isGroup } = normalised;

  // ── Validate personal number ─────────────────────────────────────────────────
  if (!isGroup) {
    let exists;
    try {
      exists = await validateNumber(instance.id, jid);
    } catch (err) {
      await addLog({
        sourceIp, instanceId: instance.id, instancePhone: instance.phone,
        id: id.trim(), message: message.trim(),
        status: 'failed', error: `Number validation failed: ${err.message}`,
      });
      return res.status(503).json({ error: err.message });
    }
    if (!exists) {
      await addLog({
        sourceIp, instanceId: instance.id, instancePhone: instance.phone,
        id: id.trim(), message: message.trim(),
        status: 'failed',
        error: `The number ${jid} is not registered on WhatsApp`,
      });
      return res.status(422).json({
        error: `The number ${jid} is not registered on WhatsApp`,
      });
    }
  }

  // ── Resolve recipient name ───────────────────────────────────────────────────
  const recipientName = await getRecipientName(instance.id, jid, isGroup);

  // ── Enqueue ──────────────────────────────────────────────────────────────────
  try {
    const jobId = await enqueueMessage(
      instance.id, instance.phone, jid, recipientName,
      message.trim(), id.trim(), sourceIp,
    );

    return res.status(202).json({
      success: true,
      jobId,
      message: 'Message queued successfully',
      destination: jid,
      type: isGroup ? 'group' : 'personal',
      sentFrom: instance.id,
      sentFromName: instance.name,
    });
  } catch (err) {
    // Logged by queue.service.js already — just return the error
    console.error('[sendMessage]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
