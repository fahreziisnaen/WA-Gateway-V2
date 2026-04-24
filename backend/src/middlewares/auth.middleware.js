import { isValidKey } from '../services/apikey.service.js';
import { isIpAllowed } from '../services/allowedIp.service.js';
import { addLog } from '../services/log.service.js';
import { getSourceIp } from '../utils/request.utils.js';

/**
 * API key middleware for external integrations (SolarWinds, PRTG, etc).
 *
 * Authentication order:
 *   1. IP whitelist        → if source IP is whitelisted, skip API key check
 *   2. Authorization header → Bearer <key>
 *   3. x-api-key header    → <key>
 *   4. Body field           → apikey=<key>  (for form-urlencoded / PRTG)
 *
 * All authentication failures are recorded in the message log.
 */
export async function authMiddleware(req, res, next) {
  const sourceIp = getSourceIp(req);

  // ── 1. IP whitelist bypass ────────────────────────────────────────────────
  try {
    if (await isIpAllowed(sourceIp)) {
      req.authMethod = 'ip-whitelist';
      return next();
    }
  } catch {
    // If whitelist check fails, fall through to API key check
  }

  // ── 2–4. Extract API key from multiple sources ────────────────────────────
  let token = null;

  // 2. Bearer token header
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // 3. x-api-key header
  if (!token) {
    token = req.headers['x-api-key'] || null;
  }

  // 4. Body field (form-urlencoded or JSON) — for PRTG and similar
  if (!token && req.body?.apikey) {
    token = String(req.body.apikey).trim() || null;
  }

  if (!token) {
    addLog({
      sourceIp,
      id: req.body?.id ?? null,
      message: req.body?.message ?? null,
      status: 'failed',
      error: 'Unauthorized: No API key provided',
    });
    return res.status(401).json({
      error: 'Unauthorized: Provide API key via header, body field, query param, or whitelist your IP',
    });
  }

  const valid = await isValidKey(token);
  if (!valid) {
    addLog({
      sourceIp,
      id: req.body?.id ?? null,
      message: req.body?.message ?? null,
      status: 'failed',
      error: 'Unauthorized: Invalid API key',
    });
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  req.authMethod = 'api-key';
  next();
}
