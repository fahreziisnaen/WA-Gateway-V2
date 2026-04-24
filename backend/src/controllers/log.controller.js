import { getLogs } from '../services/log.service.js';

/**
 * GET /logs?limit=100&from=YYYY-MM-DD&to=YYYY-MM-DD&cursor=<id>&status=success|failed
 */
export async function getLogsController(req, res) {
  try {
    const limit  = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const from   = req.query.from   || null;
    const to     = req.query.to     || null;
    const cursor = req.query.cursor || null;
    const status = req.query.status || null;
    const result = getLogs({ limit, from, to, cursor, status });
    return res.json(result);
  } catch (err) {
    console.error('[getLogs]', err);
    return res.status(500).json({ error: 'Failed to retrieve logs' });
  }
}
