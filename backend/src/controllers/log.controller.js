import { getLogs } from '../services/log.service.js';

/**
 * GET /logs?limit=100
 */
export async function getLogsController(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
    const logs = await getLogs(limit);
    return res.json(logs);
  } catch (err) {
    console.error('[getLogs]', err);
    return res.status(500).json({ error: 'Failed to retrieve logs' });
  }
}
