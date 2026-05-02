import { verifyPassword } from '../services/user.service.js';
import { signToken } from '../middlewares/jwt.middleware.js';
import { addAuditLog } from '../services/audit.service.js';
import { getSourceIp } from '../utils/request.utils.js';
import { authenticator } from 'otplib';

/**
 * POST /auth/login
 * Body: { username, password, totpCode? }
 */
export async function loginController(req, res) {
  try {
    const { username, password, totpCode } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const ip = getSourceIp(req);
    const result = await verifyPassword(username, password);

    if (!result) {
      addAuditLog({ action: 'login.failure', details: { username }, ip });
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const { safeUser: user, rawUser } = result;

    if (rawUser.two_factor_enabled) {
      if (!totpCode) {
        return res.json({ requires2FA: true });
      }
      
      const isValid = authenticator.verify({ token: totpCode, secret: rawUser.two_factor_secret });
      if (!isValid) {
        addAuditLog({ action: 'login.2fa.failure', details: { username }, ip });
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }

    addAuditLog({ actor: user.username, actorId: user.id, action: 'login.success', ip });
    const token = signToken({ id: user.id, username: user.username, role: user.role });

    return res.json({ token, user });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
