import { authMiddleware } from '../middlewares/auth.middleware.js';
import { sendMessageController } from '../controllers/message.controller.js';
import { getGroupsController } from '../controllers/group.controller.js';
import { getStatusController } from '../controllers/status.controller.js';
import { getLogsController } from '../controllers/log.controller.js';
import { getQRController, resetSessionController } from '../controllers/session.controller.js';

/**
 * Register all application routes.
 * @param {import('express').Application} app
 */
export function registerRoutes(app) {
  // ── Public (no API key required) ──────────────────────────────────────────
  app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));
  app.get('/status', getStatusController);
  app.get('/qr', getQRController);

  // ── Protected (x-api-key required) ───────────────────────────────────────
  app.post('/send-message', authMiddleware, sendMessageController);
  app.get('/groups', authMiddleware, getGroupsController);
  app.post('/reset-session', authMiddleware, resetSessionController);
  app.get('/logs', authMiddleware, getLogsController);

  // ── 404 catch-all ─────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
  });
}
