/**
 * BullMQ Worker for Batched Push Notification Jobs
 *
 * Processes jobs from the 'notification-batch' queue. Each job fires
 * after a 2-minute batching window for a specific user. The worker:
 *
 * 1. LRANGE the user's pending notification list from Redis
 * 2. DEL the list (consume the batch)
 * 3. If 1 item: send direct FOMO-style notification
 * 4. If multiple items: send summary notification
 *
 * Concurrency: 5 (notification sending is I/O-bound, not rate-limited).
 *
 * Graceful degradation: Returns null worker if REDIS_URL is not set.
 *
 * Phase 5: Social Feed & Real-time (Plan 2)
 */

import { Worker, Job } from 'bullmq';
import { createBullMQConnection, getRedisUrl } from '../config/redis';
import { pushNotificationService } from '../services/PushNotificationService';
import { getRedis } from '../utils/redisRateLimiter';
import { captureException } from '../utils/sentry';
import logger from '../utils/logger';
import { QueueContracts } from './queueContracts';

let notificationWorker: Worker | null = null;

type BatchCheckin = {
  username?: string;
  eventName?: string;
  venueName?: string;
  checkinId?: string;
  eventId?: string | null;
  deepLink?: string;
};

function compactData(data: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as Record<string, string>;
}

export async function processNotificationBatch(job: Pick<Job, 'id' | 'data'>) {
  const { userId } = job.data as { userId?: string };
  logger.info('Processing notification batch', { jobId: job.id, userId });

  if (!userId || typeof userId !== 'string') {
    logger.warn('Notification batch job missing userId', { jobId: job.id });
    return { sent: false, reason: 'missing_user_id' };
  }

  const redis = getRedis();
  if (!redis) {
    logger.warn('Redis not available, skipping notification batch', { userId });
    return { sent: false, reason: 'redis_unavailable' };
  }

  const listKey = `notif:batch:${userId}`;
  const markerKey = `notif:batch:marker:${userId}`;

  const multi = redis.multi();
  multi.lrange(listKey, 0, -1);
  multi.del(listKey, markerKey);
  const results = await multi.exec();
  const items = (results && results[0] && results[0][1]) as string[] | null;

  if (!items || items.length === 0) {
    logger.info('Notification batch empty', { userId });
    return { sent: false, reason: 'empty_batch' };
  }

  const checkins: BatchCheckin[] = [];
  for (const item of items) {
    try {
      const parsed = JSON.parse(item) as BatchCheckin;
      if (!parsed || typeof parsed !== 'object' || !parsed.username) {
        logger.warn('Notification batch malformed item', { userId });
        continue;
      }
      checkins.push(parsed);
    } catch (err) {
      logger.warn('Notification batch parse error', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (checkins.length === 0) {
    logger.info('Notification batch parse error: no valid items', {
      userId,
      itemCount: items.length,
    });
    return { sent: false, reason: 'parse_error' };
  }

  if (!pushNotificationService.isAvailable) {
    logger.debug('Push notifications disabled (Firebase not configured). Skipping batch send.', {
      userId,
      count: checkins.length,
    });
    return { sent: false, reason: 'fcm_disabled', count: checkins.length };
  }

  if (checkins.length === 1) {
    const checkin = checkins[0];
    await pushNotificationService.sendToUser(userId, {
      title: `${checkin.username || 'Someone'} checked in!`,
      body: `At ${checkin.eventName || 'a show'} @ ${checkin.venueName || ''}`,
      data: compactData({
        type: 'friend_checkin',
        checkinId: checkin.checkinId,
        eventId: checkin.eventId || undefined,
        deepLink:
          checkin.deepLink || (checkin.checkinId ? `/checkins/${checkin.checkinId}` : undefined),
      }),
    });
  } else {
    const first = checkins[0];
    const othersCount = checkins.length - 1;
    await pushNotificationService.sendToUser(userId, {
      title: `${checkins.length} friends checked in!`,
      body: `${first.username || 'Someone'} and ${othersCount} ${othersCount === 1 ? 'other' : 'others'} are at shows tonight`,
      data: {
        type: 'friend_checkin_batch',
        count: String(checkins.length),
        deepLink: '/feed',
      },
    });
  }

  logger.info('Notification batch sent count', { userId, count: checkins.length });
  return { sent: true, count: checkins.length };
}

/**
 * Start the BullMQ worker for notification batch jobs.
 *
 * Returns the Worker instance for graceful shutdown, or null
 * if Redis is not available.
 */
export function startNotificationWorker(): Worker | null {
  try {
    getRedisUrl();
  } catch {
    logger.warn('REDIS_URL not configured. Notification batch worker is disabled.');
    return null;
  }

  const worker = new Worker(QueueContracts.notificationBatch.queueName, processNotificationBatch, {
    connection: createBullMQConnection(),
    concurrency: 5,
    lockDuration: 30000, // 30s — notification sends are quick
  });

  // Event listeners for monitoring
  worker.on('completed', (job: Job) => {
    logger.info('Job completed', { jobId: job.id });
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(`Job failed: ${job?.id || 'unknown'}`, {
      jobId: job?.id,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    });
    captureException(err, { queue: 'notification-batch', jobId: job?.id });
  });

  worker.on('error', (err: Error) => {
    logger.error('Worker error', { error: err.message });
  });

  notificationWorker = worker;
  logger.info('Notification batch worker started (concurrency: 5)');

  return worker;
}

/**
 * Stop the BullMQ worker gracefully.
 *
 * Waits for the current job to complete before closing.
 */
export async function stopNotificationWorker(worker?: Worker | null): Promise<void> {
  const w = worker || notificationWorker;
  if (!w) return;

  try {
    await w.close();
    logger.info('Notification batch worker stopped gracefully');
  } catch (err) {
    logger.error('Error stopping notification batch worker', {
      error: (err as Error).message,
    });
  }
}
