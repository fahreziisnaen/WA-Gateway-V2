/**
 * Normalize a WhatsApp destination ID to the correct JID format.
 *
 * Supported inputs:
 *   628xxxx              →  628xxxx@s.whatsapp.net   (personal)
 *   628xxxx@c.us         →  628xxxx@s.whatsapp.net   (personal)
 *   628xxxx@s.whatsapp.net → (unchanged)             (personal)
 *   120xxx@g.us          →  120xxx@g.us              (group, unchanged)
 *
 * @param {string} id - Raw destination ID
 * @returns {{ jid: string, isGroup: boolean }}
 */
export function normalizeId(id) {
  if (!id || typeof id !== 'string') {
    throw new Error('ID must be a non-empty string');
  }

  const trimmed = id.trim();

  // Group JID — keep as-is
  if (trimmed.endsWith('@g.us')) {
    return { jid: trimmed, isGroup: true };
  }

  // Already normalised personal JID
  if (trimmed.endsWith('@s.whatsapp.net')) {
    return { jid: trimmed, isGroup: false };
  }

  // Legacy @c.us format → convert to @s.whatsapp.net
  if (trimmed.endsWith('@c.us')) {
    const number = trimmed.replace('@c.us', '');
    return { jid: `${number}@s.whatsapp.net`, isGroup: false };
  }

  // Plain number (digits only)
  if (/^\d+$/.test(trimmed)) {
    return { jid: `${trimmed}@s.whatsapp.net`, isGroup: false };
  }

  throw new Error(
    `Invalid ID format: "${id}". ` +
    'Expected a phone number, number@c.us, number@s.whatsapp.net, or groupId@g.us'
  );
}
