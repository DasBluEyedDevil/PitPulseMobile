import { getRedis } from '../utils/redisRateLimiter';
import logger from '../utils/logger';

export const REALTIME_DELIVERY_CHANNEL = 'realtime:deliver';

export type RealtimeDeliveryEnvelope =
  | {
      target: 'user';
      userId: string;
      type: string;
      payload: any;
    }
  | {
      target: 'room';
      room: string;
      type: string;
      payload: any;
    };

export class RealtimePublisher {
  async publishToUser(userId: string, type: string, payload: any): Promise<boolean> {
    return this.publish({ target: 'user', userId, type, payload });
  }

  async publishToRoom(room: string, type: string, payload: any): Promise<boolean> {
    return this.publish({ target: 'room', room, type, payload });
  }

  async publish(envelope: RealtimeDeliveryEnvelope): Promise<boolean> {
    const redis = getRedis();
    if (!redis) {
      logger.warn('[RealtimePublisher] Redis unavailable for realtime delivery', {
        target: envelope.target,
        type: envelope.type,
      });
      return false;
    }

    try {
      await redis.publish(REALTIME_DELIVERY_CHANNEL, JSON.stringify(envelope));
      logger.debug('[RealtimePublisher] Published realtime envelope', {
        target: envelope.target,
        type: envelope.type,
      });
      return true;
    } catch (error) {
      logger.error('[RealtimePublisher] Failed to publish realtime envelope', {
        target: envelope.target,
        type: envelope.type,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

export const realtimePublisher = new RealtimePublisher();
