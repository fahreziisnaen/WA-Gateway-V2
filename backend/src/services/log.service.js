import db from './db.js';

const RETENTION_DAYS = 90;

const stmtInsert = db.prepare(`
  INSERT INTO message_logs
    (timestamp, source_ip, instance_id, instance_phone, recipient_id, recipient_name, message, status, error)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

export function addLog({ instanceId = null, instancePhone = null, id, recipientName = null, message, status, error, sourceIp = null }) {
  const timestamp = new Date().toISOString();
  try {
    stmtInsert.run(timestamp, sourceIp, instanceId, instancePhone, id ?? null, recipientName, message, status, error ?? null);
  } catch (err) {
    console.error('[log] Failed to write log entry:', err.message);
  }
  return { timestamp, sourceIp, instanceId, instancePhone, id, recipientName, message, status, error: error ?? null };
}

export function getLogs({ limit = 100, from = null, to = null, cursor = null, status = null, search = null } = {}) {
  const dateConditions = [];
  const dateParams = [];

  if (from) {
    dateConditions.push('timestamp >= ?');
    dateParams.push(new Date(from).toISOString());
  }
  if (to) {
    const toDate = new Date(to);
    toDate.setUTCHours(23, 59, 59, 999);
    dateConditions.push('timestamp <= ?');
    dateParams.push(toDate.toISOString());
  }

  // Stats always cover the full date range (no status or cursor filter)
  const statsWhere = dateConditions.length ? `WHERE ${dateConditions.join(' AND ')}` : '';
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN status = 'failed'  THEN 1 ELSE 0 END) as failed
    FROM message_logs ${statsWhere}
  `).get(...dateParams);

  // Build log query conditions (date + status + cursor)
  const conditions = [...dateConditions];
  const params = [...dateParams];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search) {
    const like = `%${search}%`;
    conditions.push('(instance_id LIKE ? OR source_ip LIKE ? OR recipient_id LIKE ? OR recipient_name LIKE ? OR message LIKE ?)');
    params.push(like, like, like, like, like);
  }
  if (cursor) {
    conditions.push('id < ?');
    params.push(parseInt(cursor, 10));
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const capped = Math.min(limit, 500);

  const rows = db.prepare(`
    SELECT id as rowId, timestamp, source_ip as sourceIp, instance_id as instanceId,
           instance_phone as instancePhone, recipient_id as id,
           recipient_name as recipientName, message, status, error
    FROM message_logs ${where}
    ORDER BY rowId DESC
    LIMIT ?
  `).all(...params, capped + 1);

  const hasMore = rows.length > capped;
  if (hasMore) rows.pop();
  const nextCursor = hasMore ? String(rows[rows.length - 1].rowId) : null;

  // Strip internal rowId cursor field from results
  const logs = rows.map(({ rowId, ...rest }) => rest);

  return {
    logs,
    hasMore,
    nextCursor,
    stats: { total: stats.total ?? 0, success: stats.success ?? 0, failed: stats.failed ?? 0 },
  };
}

export function cleanOldLogs() {
  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const result = db.prepare('DELETE FROM message_logs WHERE timestamp < ?').run(cutoff);
    if (result.changes > 0) {
      console.log(`[log] Cleaned ${result.changes} entries older than ${RETENTION_DAYS} days`);
    }
  } catch (err) {
    console.error('[log] Failed to clean old logs:', err.message);
  }
}
