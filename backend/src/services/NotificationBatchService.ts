import type { Queue } from 'bullmq';
import { notificationQueue } from '../jobs/notificationQueue';
import { getRedis } from '../utils/redisRateLimiter';
import logger from '../utils/logger';

export interface NotificationBatchItem {
  username: string;
  eventName: string;
  venueName: string;
  checkinId: string;
  eventId?: string | null;
  deepLink: string;
}

const BATCH_DELAY_MS = 120_000;
const BATCH_TTL_SECONDS = 300;

export class NotificationBatchService {
  constructor(private readonly queue: Queue | null = notificationQueue) {}

  async appendForUser(userId: string, item: NotificationBatchItem): Promise<boolean> {
    const redis = getRedis();
    if (!redis) {
      logger.debug('Notification batch append skipped: Redis unavailable', { userId });
      return false;
    }

    if (!this.queue) {
      logger.debug('Notification batch append skipped: queue unavailable', { userId });
      return false;
    }

    const listKey = `notif:batch:${userId}`;
    const markerKey = `notif:batch:marker:${userId}`;
    const serializedItem = JSON.stringify(item);

    const multi = redis.multi();
    multi.rpush(listKey, serializedItem);
    multi.expire(listKey, BATCH_TTL_SECONDS);
    multi.set(markerKey, '1', 'EX', BATCH_TTL_SECONDS, 'NX');

    const results = await multi.exec();
    const markerCreated = results?.[2]?.[1] === 'OK';

    logger.info('Notification batch append', {
      userId,
      checkinId: item.checkinId,
      markerCreated,
    });

    if (!markerCreated) {
      return true;
    }

    logger.info('Notification batch marker created', { userId, markerKey });

    try {
      await this.queue.add(
        'send-batch',
        { userId },
        {
          delay: BATCH_DELAY_MS,
          jobId: `notif-batch:${userId}`,
        }
      );
      return true;
    } catch (err) {
      await redis.del(markerKey).catch((cleanupErr: unknown) => {
        logger.warn('Notification batch marker cleanup failed after queue add failure', {
          userId,
          error: cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr),
        });
      });

      logger.error('Notification batch queue add failure', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }
}

export const notificationBatchService = new NotificationBatchService();
