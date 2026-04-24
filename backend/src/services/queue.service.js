import { sendMessage } from './waManager.js';
import { addLog } from './log.service.js';

async function sendWithRetry(instanceId, instancePhone, jid, recipientName, message, originalId, sourceIp, maxAttempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await sendMessage(instanceId, jid, message);
      await addLog({ instanceId, instancePhone, id: originalId, recipientName, message, status: 'success', error: null, sourceIp });
      console.log(`[queue:direct] [${instanceId}] Sent to ${jid} (attempt ${attempt})`);
      return `direct-${Date.now()}`;
    } catch (err) {
      lastErr = err;
      console.warn(`[queue:direct] [${instanceId}] Attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  await addLog({ instanceId, instancePhone, id: originalId, recipientName, message, status: 'failed', error: lastErr.message, sourceIp });
  throw lastErr;
}

let enqueueMessage;

try {
  const { Queue, Worker } = await import('bullmq');
  const { default: IORedis } = await import('ioredis');

  const connection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
    lazyConnect: true,
    connectTimeout: 3000,
    retryStrategy: () => null,
  });

  await connection.connect();
  await connection.ping();

  const messageQueue = new Queue('wa-messages', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  });

  const worker = new Worker(
    'wa-messages',
    async (job) => {
      const { instanceId, instancePhone, jid, recipientName, message, originalId, sourceIp } = job.data;
      console.log(`[queue:bullmq] [${instanceId}] Processing job ${job.id} → ${jid}`);
      await sendMessage(instanceId, jid, message);
      await addLog({ instanceId, instancePhone, id: originalId, recipientName, message, status: 'success', error: null, sourceIp });
    },
    { connection, concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '2', 10) }
  );

  worker.on('failed', async (job, err) => {
    if (job && job.attemptsMade >= (job.opts?.attempts ?? 3)) {
      await addLog({
        instanceId: job.data.instanceId,
        instancePhone: job.data.instancePhone,
        id: job.data.originalId,
        recipientName: job.data.recipientName,
        message: job.data.message,
        status: 'failed',
        error: err.message,
        sourceIp: job.data.sourceIp,
      });
    }
  });

  worker.on('error', (err) => console.error('[queue:bullmq] Worker error:', err.message));
  console.log('[queue] BullMQ + Redis mode active');

  enqueueMessage = async (instanceId, instancePhone, jid, recipientName, message, originalId, sourceIp) => {
    const job = await messageQueue.add('send', { instanceId, instancePhone, jid, recipientName, message, originalId, sourceIp });
    return job.id;
  };

} catch (err) {
  console.warn(`[queue] Redis not available (${err.message}) — using direct send mode`);

  enqueueMessage = async (instanceId, instancePhone, jid, recipientName, message, originalId, sourceIp) => {
    setImmediate(() => sendWithRetry(instanceId, instancePhone, jid, recipientName, message, originalId, sourceIp).catch(() => {}));
    return `direct-${Date.now()}`;
  };
}

export { enqueueMessage };
