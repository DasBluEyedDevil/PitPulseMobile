import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotificationBatchService } from '../../services/NotificationBatchService';
import { getRedis } from '../../utils/redisRateLimiter';

jest.mock('../../jobs/notificationQueue', () => ({ notificationQueue: null }));
jest.mock('../../utils/redisRateLimiter', () => ({ getRedis: jest.fn() }));

const mockedGetRedis = getRedis as jest.MockedFunction<typeof getRedis>;

describe('NotificationBatchService', () => {
  const item = {
    username: 'friend',
    eventName: 'show',
    venueName: 'venue',
    checkinId: 'checkin-1',
    eventId: 'event-1',
    deepLink: '/checkins/checkin-1',
  };

  let rpush: ReturnType<typeof jest.fn>;
  let expire: ReturnType<typeof jest.fn>;
  let set: ReturnType<typeof jest.fn>;
  let exec: ReturnType<typeof jest.fn<() => Promise<any>>>;
  let del: ReturnType<typeof jest.fn<(key: string) => Promise<number>>>;
  let queueAdd: ReturnType<typeof jest.fn<(...args: any[]) => Promise<any>>>;

  beforeEach(() => {
    jest.clearAllMocks();
    rpush = jest.fn();
    expire = jest.fn();
    set = jest.fn();
    exec = jest.fn<() => Promise<any>>().mockResolvedValue([
      [null, 1],
      [null, 1],
      [null, 'OK'],
    ]);
    del = jest.fn<(key: string) => Promise<number>>().mockResolvedValue(1);
    queueAdd = jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({ id: 'job-1' });

    mockedGetRedis.mockReturnValue({
      multi: () => ({ rpush, expire, set, exec }),
      del,
    } as any);
  });

  it('atomically appends, sets TTL and marker, then enqueues only for a new marker', async () => {
    const service = new NotificationBatchService({ add: queueAdd } as any);

    const result = await service.appendForUser('user-1', item);

    expect(result).toBe(true);
    expect(rpush).toHaveBeenCalledWith('notif:batch:user-1', JSON.stringify(item));
    expect(expire).toHaveBeenCalledWith('notif:batch:user-1', 300);
    expect(set).toHaveBeenCalledWith('notif:batch:marker:user-1', '1', 'EX', 300, 'NX');
    expect(queueAdd).toHaveBeenCalledWith(
      'send-batch',
      { userId: 'user-1' },
      { delay: 120000, jobId: 'notif-batch:user-1' }
    );
  });

  it('does not enqueue when the marker already exists', async () => {
    exec.mockResolvedValueOnce([
      [null, 1],
      [null, 1],
      [null, null],
    ]);
    const service = new NotificationBatchService({ add: queueAdd } as any);

    const result = await service.appendForUser('user-1', item);

    expect(result).toBe(true);
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('deletes the marker when delayed job enqueue fails', async () => {
    queueAdd.mockRejectedValueOnce(new Error('queue down'));
    const service = new NotificationBatchService({ add: queueAdd } as any);

    const result = await service.appendForUser('user-1', item);

    expect(result).toBe(false);
    expect(del).toHaveBeenCalledWith('notif:batch:marker:user-1');
  });
});
