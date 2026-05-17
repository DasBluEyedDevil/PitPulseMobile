import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const publish = jest.fn<(channel: string, message: string) => Promise<number>>();

jest.mock('../../utils/redisRateLimiter', () => ({
  getRedis: jest.fn(() => ({ publish })),
}));

import { getRedis } from '../../utils/redisRateLimiter';
import {
  REALTIME_DELIVERY_CHANNEL,
  RealtimePublisher,
} from '../../services/RealtimePublisher';

const mockedGetRedis = getRedis as jest.MockedFunction<typeof getRedis>;

describe('RealtimePublisher', () => {
  let publisher: RealtimePublisher;

  beforeEach(() => {
    jest.clearAllMocks();
    publish.mockResolvedValue(1);
    mockedGetRedis.mockReturnValue({ publish } as any);
    publisher = new RealtimePublisher();
  });

  test('publishes user delivery envelopes to realtime channel', async () => {
    const result = await publisher.publishToUser('user-1', 'notification', { message: 'hello' });

    expect(result).toBe(true);
    expect(publish).toHaveBeenCalledWith(
      REALTIME_DELIVERY_CHANNEL,
      JSON.stringify({
        target: 'user',
        userId: 'user-1',
        type: 'notification',
        payload: { message: 'hello' },
      })
    );
  });

  test('publishes room delivery envelopes to realtime channel', async () => {
    const result = await publisher.publishToRoom('checkin:123', 'new_comment', {
      checkinId: '123',
    });

    expect(result).toBe(true);
    expect(publish).toHaveBeenCalledWith(
      REALTIME_DELIVERY_CHANNEL,
      JSON.stringify({
        target: 'room',
        room: 'checkin:123',
        type: 'new_comment',
        payload: { checkinId: '123' },
      })
    );
  });

  test('returns false when Redis is unavailable', async () => {
    mockedGetRedis.mockReturnValue(null);

    const result = await publisher.publishToUser('user-1', 'notification', {});

    expect(result).toBe(false);
    expect(publish).not.toHaveBeenCalled();
  });

  test('returns false when Redis publish fails', async () => {
    publish.mockRejectedValue(new Error('publish failed'));

    const result = await publisher.publishToRoom('event:123', 'new_checkin', {});

    expect(result).toBe(false);
  });
});
