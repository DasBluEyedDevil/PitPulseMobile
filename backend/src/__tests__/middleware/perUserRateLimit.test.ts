import { describe, it, expect, beforeEach, afterAll, jest } from '@jest/globals';
import { resetUserRateLimit, rateLimiter } from '../../middleware/perUserRateLimit';
import { getRedis } from '../../utils/redisRateLimiter';

jest.mock('../../utils/redisRateLimiter', () => ({
  getRedis: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

const mockedGetRedis = getRedis as jest.MockedFunction<typeof getRedis>;

describe('PerUserRateLimiter reset', () => {
  afterAll(() => {
    rateLimiter.destroy();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses SCAN MATCH COUNT and batched UNLINK instead of KEYS', async () => {
    const redis = {
      scan: jest
        .fn<() => Promise<[string, string[]]>>()
        .mockResolvedValueOnce(['12', ['ratelimit:user:user:user-1:1']])
        .mockResolvedValueOnce(['0', ['ratelimit:user:user:user-1:2']]),
      unlink: jest.fn<() => Promise<number>>().mockResolvedValue(1),
      keys: jest.fn(),
      del: jest.fn(),
    } as any;
    mockedGetRedis.mockReturnValue(redis);

    await resetUserRateLimit('user-1');

    expect(redis.scan).toHaveBeenNthCalledWith(
      1,
      '0',
      'MATCH',
      'ratelimit:user:user:user-1:*',
      'COUNT',
      100
    );
    expect(redis.scan).toHaveBeenNthCalledWith(
      2,
      '12',
      'MATCH',
      'ratelimit:user:user:user-1:*',
      'COUNT',
      100
    );
    expect(redis.unlink).toHaveBeenCalledWith('ratelimit:user:user:user-1:1');
    expect(redis.unlink).toHaveBeenCalledWith('ratelimit:user:user:user-1:2');
    expect(redis.keys).not.toHaveBeenCalled();
    expect(redis.del).not.toHaveBeenCalled();
  });
});
