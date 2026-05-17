import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { processNotificationBatch } from '../../jobs/notificationWorker';
import { pushNotificationService } from '../../services/PushNotificationService';
import { getRedis } from '../../utils/redisRateLimiter';

jest.mock('../../config/redis', () => ({
  createBullMQConnection: jest.fn(),
  getRedisUrl: jest.fn(() => 'redis://localhost:6379'),
}));
jest.mock('../../utils/redisRateLimiter', () => ({ getRedis: jest.fn() }));
jest.mock('../../services/PushNotificationService', () => ({
  pushNotificationService: {
    isAvailable: true,
    sendToUser: jest.fn(),
  },
}));

const mockedGetRedis = getRedis as jest.MockedFunction<typeof getRedis>;
const mockedPush = pushNotificationService as jest.Mocked<typeof pushNotificationService>;

describe('processNotificationBatch', () => {
  let lrange: ReturnType<typeof jest.fn>;
  let del: ReturnType<typeof jest.fn>;
  let exec: ReturnType<typeof jest.fn<() => Promise<any>>>;

  beforeEach(() => {
    jest.clearAllMocks();
    lrange = jest.fn();
    del = jest.fn();
    exec = jest.fn<() => Promise<any>>();
    mockedGetRedis.mockReturnValue({
      multi: () => ({ lrange, del, exec }),
    } as any);
    Object.defineProperty(mockedPush, 'isAvailable', { value: true, configurable: true });
  });

  it('sends single friend check-in payload with route data and consumes list plus marker', async () => {
    exec.mockResolvedValueOnce([
      [
        null,
        [
          JSON.stringify({
            username: 'friend',
            eventName: 'show',
            venueName: 'venue',
            checkinId: 'checkin-1',
            eventId: 'event-1',
            deepLink: '/checkins/checkin-1',
          }),
        ],
      ],
      [null, 2],
    ]);

    const result = await processNotificationBatch({ id: 'job-1', data: { userId: 'user-1' } });

    expect(result).toEqual({ sent: true, count: 1 });
    expect(del).toHaveBeenCalledWith('notif:batch:user-1', 'notif:batch:marker:user-1');
    expect(mockedPush.sendToUser).toHaveBeenCalledWith('user-1', {
      title: 'friend checked in!',
      body: 'At show @ venue',
      data: {
        type: 'friend_checkin',
        checkinId: 'checkin-1',
        eventId: 'event-1',
        deepLink: '/checkins/checkin-1',
      },
    });
  });

  it('sends batch payload with count and feed deep link', async () => {
    exec.mockResolvedValueOnce([
      [
        null,
        [
          JSON.stringify({ username: 'first', eventName: 'show', venueName: 'venue' }),
          JSON.stringify({ username: 'second', eventName: 'show', venueName: 'venue' }),
        ],
      ],
      [null, 2],
    ]);

    const result = await processNotificationBatch({ id: 'job-1', data: { userId: 'user-1' } });

    expect(result).toEqual({ sent: true, count: 2 });
    expect(mockedPush.sendToUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        data: { type: 'friend_checkin_batch', count: '2', deepLink: '/feed' },
      })
    );
  });

  it('handles malformed and empty batches without throwing', async () => {
    exec.mockResolvedValueOnce([
      [null, ['not json']],
      [null, 2],
    ]);

    await expect(
      processNotificationBatch({ id: 'job-1', data: { userId: 'user-1' } })
    ).resolves.toEqual({ sent: false, reason: 'parse_error' });

    exec.mockResolvedValueOnce([
      [null, []],
      [null, 1],
    ]);

    await expect(
      processNotificationBatch({ id: 'job-2', data: { userId: 'user-1' } })
    ).resolves.toEqual({ sent: false, reason: 'empty_batch' });
  });
});
