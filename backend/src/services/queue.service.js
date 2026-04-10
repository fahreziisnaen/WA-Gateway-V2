import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { sendMessage } from '../whatsapp.js';
import { addLog } from './log.service.js';

// ── Redis connection ──────────────────────────────────────────────────────────

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null, // Required by BullMQ
});

connection.on('error', (err) => {
  console.error('[queue] Redis error:', err.message);
});

connection.on('connect', () => {
  console.log('[queue] Redis connected');
});

// ── Queue definition ──────────────────────────────────────────────────────────

export const messageQueue = new Queue('wa-messages', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2_000, // 2s, 4s, 8s
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

// ── Worker ────────────────────────────────────────────────────────────────────

const worker = new Worker(
  'wa-messages',
  async (job) => {
    const { jid, message, originalId } = job.data;

    console.log(`[queue] Processing job ${job.id} → ${jid}`);
    await sendMessage(jid, message);

    await addLog({ id: originalId, message, status: 'success', error: null });
    console.log(`[queue] Job ${job.id} completed`);
  },
  {
    connection,
    concurrency: 3,
  }
);

worker.on('failed', async (job, err) => {
  console.error(`[queue] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);

  // Only log as failed after all retries are exhausted
  if (job && job.attemptsMade >= (job.opts?.attempts ?? 3)) {
    await addLog({
      id: job.data.originalId,
      message: job.data.message,
      status: 'failed',
      error: err.message,
    });
  }
});

worker.on('error', (err) => {
  console.error('[queue] Worker error:', err.message);
});

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Add a message to the sending queue.
 * @param {string} jid        Normalised WhatsApp JID
 * @param {string} message    Text to send
 * @param {string} originalId Raw ID from the API request (for logging)
 * @returns {Promise<string>} BullMQ job ID
 */
export async function enqueueMessage(jid, message, originalId) {
  const job = await messageQueue.add('send', { jid, message, originalId });
  console.log(`[queue] Enqueued job ${job.id} for ${jid}`);
  return job.id;
}
