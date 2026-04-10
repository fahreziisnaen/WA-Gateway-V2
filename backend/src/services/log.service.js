import fs from 'fs-extra';
import path from 'path';

const LOG_FILE = process.env.LOG_FILE
  ? path.resolve(process.env.LOG_FILE)
  : path.join(process.cwd(), 'logs', 'messages.log');

// Ensure log directory exists on module load
await fs.ensureDir(path.dirname(LOG_FILE));

/**
 * Append a log entry to the NDJSON log file.
 * @param {{ id: string, message: string, status: 'success'|'failed', error: string|null }} entry
 */
export async function addLog(entry) {
  const log = {
    timestamp: new Date().toISOString(),
    id: entry.id,
    message: entry.message,
    status: entry.status,
    error: entry.error ?? null,
  };

  try {
    await fs.appendFile(LOG_FILE, JSON.stringify(log) + '\n', 'utf-8');
  } catch (err) {
    console.error('[log] Failed to write log entry:', err.message);
  }

  return log;
}

/**
 * Read the most recent `limit` log entries (newest first).
 * @param {number} limit
 * @returns {Promise<object[]>}
 */
export async function getLogs(limit = 100) {
  try {
    const exists = await fs.pathExists(LOG_FILE);
    if (!exists) return [];

    const content = await fs.readFile(LOG_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    const logs = lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Return the most recent entries, newest first
    return logs.slice(-limit).reverse();
  } catch (err) {
    console.error('[log] Failed to read logs:', err.message);
    return [];
  }
}
