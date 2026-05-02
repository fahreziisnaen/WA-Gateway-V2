import { authMiddleware } from '../middlewares/auth.middleware.js';
import { jwtMiddleware } from '../middlewares/jwt.middleware.js';

import { loginController } from '../controllers/auth.controller.js';
import { sendMessageController } from '../controllers/message.controller.js';
import { getLogsController } from '../controllers/log.controller.js';
import { getAuditLogsController } from '../controllers/audit.controller.js';
import { getStatusController } from '../controllers/status.controller.js';
import {
  listInstancesController,
  getInstanceStatusController,
  getInstanceQRController,
  addInstanceController,
  removeInstanceController,
  resetInstanceController,
  getInstanceGroupsController,
} from '../controllers/instance.controller.js';
import {
  getUsersController,
  createUserController,
  changePasswordController,
  deleteUserController,
  setup2FAController,
  verify2FAController,
  disable2FAController,
  getKeysController,
  createKeyController,
  revokeKeyController,
} from '../controllers/settings.controller.js';
import {
  listGroupAliasesController,
  setGroupAliasController,
  deleteGroupAliasController,
} from '../controllers/groupAlias.controller.js';
import {
  listAllowedIpsController,
  addAllowedIpController,
  removeAllowedIpController,
} from '../controllers/allowedIp.controller.js';

export function registerRoutes(app) {
  // ── Public ──────────────────────────────────────────────────────────────────
  app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));
  app.post('/auth/login', loginController);

  // Legacy single-instance status/qr (returns first instance)
  app.get('/status', getStatusController);

  // ── API key protected (external systems) ────────────────────────────────────
  app.post('/send-message', authMiddleware, sendMessageController);

  // ── JWT protected (dashboard) ────────────────────────────────────────────────

  // Instances
  app.get('/instances', jwtMiddleware, listInstancesController);
  app.post('/instances', jwtMiddleware, addInstanceController);
  app.get('/instances/:id/status', jwtMiddleware, getInstanceStatusController);
  app.get('/instances/:id/qr', jwtMiddleware, getInstanceQRController);
  app.post('/instances/:id/reset', jwtMiddleware, resetInstanceController);
  app.delete('/instances/:id', jwtMiddleware, removeInstanceController);
  app.get('/instances/:id/groups', jwtMiddleware, getInstanceGroupsController);

  // Logs
  app.get('/logs', jwtMiddleware, getLogsController);
  app.get('/admin/audit-logs', jwtMiddleware, getAuditLogsController);

  // Users
  app.get('/admin/users', jwtMiddleware, getUsersController);
  app.post('/admin/users', jwtMiddleware, createUserController);
  app.put('/admin/users/:id/password', jwtMiddleware, changePasswordController);
  app.delete('/admin/users/:id', jwtMiddleware, deleteUserController);
  
  app.get('/admin/users/:id/2fa/setup', jwtMiddleware, setup2FAController);
  app.post('/admin/users/:id/2fa/verify', jwtMiddleware, verify2FAController);
  app.delete('/admin/users/:id/2fa', jwtMiddleware, disable2FAController);

  // API Keys
  app.get('/admin/apikeys', jwtMiddleware, getKeysController);
  app.post('/admin/apikeys', jwtMiddleware, createKeyController);
  app.delete('/admin/apikeys/:id', jwtMiddleware, revokeKeyController);

  // Group Aliases
  app.get('/admin/group-aliases', jwtMiddleware, listGroupAliasesController);
  app.post('/admin/group-aliases', jwtMiddleware, setGroupAliasController);
  app.delete('/admin/group-aliases/:alias', jwtMiddleware, deleteGroupAliasController);

  // Allowed IPs (whitelist)
  app.get('/admin/allowed-ips', jwtMiddleware, listAllowedIpsController);
  app.post('/admin/allowed-ips', jwtMiddleware, addAllowedIpController);
  app.delete('/admin/allowed-ips/:ip', jwtMiddleware, removeAllowedIpController);

  // ── 404 ─────────────────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
  });
}
